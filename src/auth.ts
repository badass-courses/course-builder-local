import * as vscode from 'vscode'
import { Issuer, Client, TokenSet } from 'openid-client'
import { getErrorMessage } from './misc' // You'll need to implement this function
import { getBaseUrl } from './config'
import { logger } from './utils/logger'

const baseUrl = getBaseUrl()
const ISSUER_URL = `${baseUrl}/oauth`
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'

export async function authenticate(
	context: vscode.ExtensionContext,
	retryAttempt = 0,
): Promise<Client> {
	try {
		console.log('Authenticating...')
		// Check if we already have a valid token
		const storedTokenSet = context.globalState.get('tokenSet') as
			| TokenSet
			| undefined

		console.log({ storedTokenSet })

		const client = await getClient()

		if (storedTokenSet) {
			return client
		}

		console.log('No stored token set. Getting device authorization...')

		const handle = await client.deviceAuthorization()

		const message = `Please click [here](${handle.verification_uri_complete}) to authorize this device.`
		const result = await vscode.window.showInformationMessage(
			message,
			'Open Link',
		)

		if (result === 'Open Link') {
			vscode.env.openExternal(
				vscode.Uri.parse(handle.verification_uri_complete),
			)
		}

		const timeout = setTimeout(() => handle.abort(), handle.expires_in * 1000)

		try {
			const tokenSet = await handle.poll()
			clearTimeout(timeout)

			if (!tokenSet) {
				throw new Error('Timed out waiting for user to authorize device.')
			}

			await storeTokenSet(context, tokenSet)

			const userinfo = await client.userinfo(tokenSet)
			context.globalState.update('userInfo', userinfo)

			console.log({ userinfo })

			vscode.window.showInformationMessage('Authentication successful!')
			return client
		} catch (error) {
			clearTimeout(timeout)
			throw error
		}
	} catch (error) {
		if (retryAttempt < 5) {
			logger.warn('Authentication failed. Clearing auth and retrying...')
			await clearAuth(context)
			return authenticate(context, retryAttempt + 1)
		}
		vscode.window.showErrorMessage(
			`Authentication failed: ${getErrorMessage(error)}`,
		)
		throw error
	}
}

export async function getClient(): Promise<Client> {
	const issuer = await Issuer.discover(ISSUER_URL)
	// @ts-expect-error
	return await issuer.Client.register({
		grant_types: [GRANT_TYPE],
		response_types: [],
		redirect_uris: [],
		token_endpoint_auth_method: 'none',
		application_type: 'native',
	})
}

export async function storeTokenSet(
	context: vscode.ExtensionContext,
	tokenSet: TokenSet,
) {
	await context.globalState.update('tokenSet', tokenSet)
}

export async function getAuthenticatedClient(
	context: vscode.ExtensionContext,
): Promise<Client> {
	const storedTokenSet = context.globalState.get('tokenSet') as
		| TokenSet
		| undefined
	if (!storedTokenSet) {
		return authenticate(context)
	}

	const client = await getClient()
	if (
		storedTokenSet.expires_at &&
		storedTokenSet.expires_at > Date.now() / 1000
	) {
		return client
	}

	try {
		const newTokenSet = await client.refresh(storedTokenSet)
		await storeTokenSet(context, newTokenSet)
		return client
	} catch (error) {
		console.error('Failed to refresh token:', error)
		return authenticate(context)
	}
}

export async function logout(context: vscode.ExtensionContext): Promise<void> {
	// Clear the stored token
	await context.globalState.update('tokenSet', undefined)

	// Clear any other stored authentication data if necessary
	// For example, if you're storing a user profile:
	// await context.globalState.update('userProfile', undefined)

	logger.info('User logged out successfully')

	// Notify the user
	vscode.window.showInformationMessage('Logged out successfully')

	// Trigger a refresh of the UI components that depend on authentication state
	vscode.commands.executeCommand('course-builder-local.refreshPosts')
}

export async function clearAuth(
	context: vscode.ExtensionContext,
): Promise<void> {
	await context.globalState.update('tokenSet', undefined)
	await context.globalState.update('userInfo', undefined)
	logger.info('Authentication data cleared')
	vscode.window.showInformationMessage('Authentication data cleared')
}
