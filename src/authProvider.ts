import * as vscode from 'vscode'
import { authenticate, getClient, storeTokenSet } from './auth'
import { logger } from './utils/logger'
import { extensionEvents } from './lib/eventEmitter'

export class AuthProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView

	constructor(private readonly _context: vscode.ExtensionContext) {
		logger.debug('AuthProvider constructor called')
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		logger.debug('Resolving AuthProvider webview')
		this._view = webviewView

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._context.extensionUri],
		}

		try {
			const html = this.getHtmlForWebview()
			logger.debug('Generated HTML for AuthProvider webview:', html)
			webviewView.webview.html = html
			logger.debug('AuthProvider webview HTML set')
		} catch (error) {
			logger.error('Error setting AuthProvider webview HTML:', error)
		}

		webviewView.webview.onDidReceiveMessage(
			async (message) => {
				logger.debug('Received message in AuthProvider:', message)
				if (message.command === 'login') {
					try {
						const client = await getClient()
						const handle = await client.deviceAuthorization()
						vscode.env.openExternal(
							vscode.Uri.parse(handle.verification_uri_complete),
						)

						const timeout = setTimeout(
							() => handle.abort(),
							handle.expires_in * 1000,
						)

						try {
							const tokenSet = await handle.poll()
							clearTimeout(timeout)

							if (!tokenSet) {
								throw new Error(
									'Timed out waiting for user to authorize device.',
								)
							}

							await storeTokenSet(this._context, tokenSet)

							const userinfo = await client.userinfo(tokenSet)
							this._context.globalState.update('userInfo', userinfo)

							console.log({ userinfo })

							vscode.window.showInformationMessage('Authentication successful!')
						} catch (error) {
							clearTimeout(timeout)
							throw error
						}

						logger.debug('Authentication successful')
						vscode.commands.executeCommand(
							'setContext',
							'course-builder-local:authenticated',
							true,
						)
						vscode.commands.executeCommand(
							'workbench.view.extension.course-builder',
						)

						extensionEvents.emit('posts:refresh')
						return client
					} catch (error) {
						const errorMessage =
							error instanceof Error ? error.message : 'Unknown error'
						logger.error('Authentication failed:', errorMessage)
						vscode.window.showErrorMessage(
							`Authentication failed: ${errorMessage}`,
						)
					}
				}
			},
			undefined,
			this._context.subscriptions,
		)
	}

	private getHtmlForWebview() {
		logger.debug('Generating HTML for AuthProvider webview')
		const styleVSCodeUri = this._view?.webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'media', 'vscode.css'),
		)
		const styleMainUri = this._view?.webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'media', 'main.css'),
		)

		logger.debug('StyleVSCodeUri:', styleVSCodeUri?.toString())
		logger.debug('StyleMainUri:', styleMainUri?.toString())

		const html = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link href="${styleVSCodeUri}" rel="stylesheet">
			<link href="${styleMainUri}" rel="stylesheet">
				<title>Course Builder Authentication</title>
		</head>
		<body>
			<div class="container">
				<h1>Course Builder</h1>
				<p>You need to log in to use the Course Builder extension.</p>
				<button id="loginButton" class="button-primary">Log In</button>
			</div>
			<script>
				const vscode = acquireVsCodeApi();
				document.getElementById('loginButton').addEventListener('click', () => {
					vscode.postMessage({ command: 'login' });
				});
			</script>
		</body>
		</html>`

		return html
	}
}
