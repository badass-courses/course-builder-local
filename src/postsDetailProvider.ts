import * as vscode from 'vscode'
import { Post } from './types'
import { Extension } from './helpers/Extension'
import { getWebviewCSSUrl, getWebviewJsFiles } from './utils/getWebviewJsFiles'
import { logger } from './utils/logger'

export class PostsDetailProvider implements vscode.TreeDataProvider<Post> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		Post | undefined | null | void
	> = new vscode.EventEmitter<Post | undefined | null | void>()
	readonly onDidChangeTreeData: vscode.Event<Post | undefined | null | void> =
		this._onDidChangeTreeData.event

	private selectedPost: Post | undefined

	constructor(private context: vscode.ExtensionContext) {}

	refresh(post?: Post): void {
		this.selectedPost = post
		this._onDidChangeTreeData.fire()
	}

	getTreeItem(element: Post): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(
			element.fields.title,
			vscode.TreeItemCollapsibleState.None,
		)
		treeItem.command = {
			command: 'course-builder-local.selectAndShowPostDetail',
			title: 'Select and Show Post Detail',
			arguments: [element],
		}
		return treeItem
	}

	getChildren(element?: Post): Thenable<Post[]> {
		if (this.selectedPost) {
			return Promise.resolve([this.selectedPost])
		}
		return Promise.resolve([])
	}
}

export async function showPostDetail(
	post: Post,
	context: vscode.ExtensionContext,
) {
	const panel = vscode.window.createWebviewPanel(
		'postDetail',
		`Post Detail: ${post.fields.title}`,
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			retainContextWhenHidden: true,
		},
	)

	panel.webview.html = await getWebviewContent(post, panel.webview)

	// Set up message passing
	panel.webview.onDidReceiveMessage(
		(message) => {
			switch (message.command) {
				case 'ready':
					// Send the post data to the webview
					panel.webview.postMessage({ command: 'post', post: post })
					return
			}
		},
		undefined,
		context.subscriptions,
	)
}

async function getWebviewContent(
	post: Post,
	webView: vscode.Webview,
): Promise<string> {
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
			window.addEventListener('message', event => {
				const message = event.data;
				switch (message.command) {
					case 'post':
						// Handle the post data
						console.log('Received post:', message.post);
						break;
				}
			});
			vscode.postMessage({ command: 'ready' });
		</script>
	</body>
	</html>`
}
