import * as vscode from 'vscode'
import { Post } from './types'
import { Extension } from './helpers/Extension'
import { getWebviewCSSUrl, getWebviewJsFiles } from './utils/getWebviewJsFiles'
import { logger } from './utils/logger'
import { tokenForContext } from './lib/token-for-context'

export class PostsDetailProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView
	private selectedPost: Post | undefined

	constructor(private context: vscode.ExtensionContext) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri],
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
			cssUrl = `http://${localServerUrl}/dashboard.css`
		}

		logger.debug('scriptUris', scriptUris)

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
		</body>
		</html>`
	}
}
