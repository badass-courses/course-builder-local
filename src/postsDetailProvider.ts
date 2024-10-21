import * as vscode from 'vscode'
import { Post } from './types'
import { Extension } from './helpers/Extension'
import { getWebviewCSSUrl, getWebviewJsFiles } from './utils/getWebviewJsFiles'
import { logger } from './utils/logger'
import { tokenForContext } from './lib/token-for-context'
import { getBaseUrl } from './config'

export class PostsDetailProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView
	private selectedPost: Post | undefined
	private _onDidReceiveMessage: (message: any) => void

	constructor(private context: vscode.ExtensionContext) {
		this._onDidReceiveMessage = (message: any) => {
			if (message.command === 'log') {
				console.log('Webview log:', message.text)
			}
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView

		webviewView.webview.options = {
			enableScripts: true,
		}

		this.updateWebview()

		webviewView.webview.onDidReceiveMessage(
			(message) => {
				logger.debug('PostsDetailProvider onDidReceiveMessage', { message })
				switch (message.command) {
					case 'ready':
						this.sendPostToWebview()
						return
				}
			},
			undefined,
			this.context.subscriptions,
		)
	}

	public refresh(post?: Post): void {
		this.selectedPost = post
		this.updateWebview()
	}

	private async updateWebview() {
		if (this._view) {
			this._view.webview.html = await this.getWebviewContent(this._view.webview)
			this.sendPostToWebview()
		}
	}

	private sendPostToWebview() {
		if (this._view) {
			this._view.webview.postMessage({
				command: 'post',
				post: this.selectedPost,
			})

			const token = tokenForContext(this.context)
			this._view.webview.postMessage({
				command: 'token',
				token,
			})

			this._view.webview.postMessage({
				command: 'apiUrl',
				apiUrl: getBaseUrl(),
			})
		}
	}

	private async getWebviewContent(webView: vscode.Webview): Promise<string> {
		const webviewFile = 'dashboard.js'
		const localPort = '9000'
		const localServerUrl = `localhost:${localPort}`

		const isProd = Extension.getInstance().isProductionMode

		let scriptUris = []

		logger.debug('isProd', isProd)

		if (isProd) {
			scriptUris = await getWebviewJsFiles('dashboard', webView)
		} else {
			scriptUris.push(`http://${localServerUrl}/${webviewFile}`)
		}

		let cssUrl = ''

		if (isProd) {
			cssUrl = await getWebviewCSSUrl('dashboard', webView)
		} else {
			cssUrl = `http://${localServerUrl}/style/dashboard.css`
		}

		logger.debug('scriptUris', scriptUris)

		// Define a CSP that allows necessary resources for MuxPlayer
		const csp = [
			`default-src 'none';`,
			`img-src ${`vscode-file://vscode-app`} ${
				webView.cspSource
			} https://api.visitorbadge.io https://*.mux.com https://*.gstatic.com 'self' 'unsafe-inline' https://* blob:;`,
			`media-src 'self' blob:vscode-webview://* https://*.mux.com ${`vscode-file://vscode-app`} ${
				webView.cspSource
			} 'self' 'unsafe-inline' https://* blob:;`,
			`script-src blob:vscode-webview://* https://*.mux.com vscode-webview://* ${
				isProd
					? `'nonce-${1212}'`
					: `http://${localServerUrl} http://0.0.0.0:${localPort}`
			} 'unsafe-eval' 'unsafe-inline' https://*;`,
			`style-src ${webView.cspSource} ${
				isProd
					? "'self'"
					: `http://${localServerUrl} http://0.0.0.0:${localPort}`
			} 'unsafe-inline' https://*;`,
			`font-src ${webView.cspSource};`,
			`connect-src https://* blob:vscode-webview://* ${
				isProd
					? ``
					: `ws://${localServerUrl} ws://0.0.0.0:${localPort} http://${localServerUrl} http://0.0.0.0:${localPort}`
			};`,
			`worker-src blob:;`,
			`child-src blob:;`,
		].join(' ')

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" content="${csp}">
			<title>Post Detail</title>
			<link rel="stylesheet" href="${cssUrl}">
		</head>
		<body>
			<div id="app"></div>
			${scriptUris.map((scriptUri) => `<script src="${scriptUri}"></script>`).join('')}
			<script>
				const vscode = acquireVsCodeApi();
				vscode.postMessage({ command: 'ready' });
			</script>
			
			<script>
				function log(message) {
					vscode.postMessage({ command: 'log', text: message });
				}
				log('Webview loaded');
				// Use this log function throughout your React components
			</script>
		</body>
		</html>`
	}
}
