import { TokenSet } from 'openid-client'
import * as vscode from 'vscode'

export function tokenForContext(
	context?: vscode.ExtensionContext,
): string | null {
	if (!context) {
		return null
	}

	const tokenSet = context.globalState.get('tokenSet') as TokenSet | undefined
	return tokenSet?.access_token || null
}
