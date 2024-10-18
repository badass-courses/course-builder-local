import * as vscode from 'vscode'

import { Post } from './types'
import { fetchPosts } from './lib/posts'
import { type TokenSet } from 'openid-client'
import { extensionEvents } from './lib/eventEmitter'

export class PostsProvider implements vscode.TreeDataProvider<Post> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		Post | undefined | null | void
	> = new vscode.EventEmitter<Post | undefined | null | void>()
	readonly onDidChangeTreeData: vscode.Event<Post | undefined | null | void> =
		this._onDidChangeTreeData.event

	refresh(): void {
		this._onDidChangeTreeData.fire()
	}

	context: vscode.ExtensionContext

	constructor(private context: vscode.ExtensionContext) {
		this.context = context

		extensionEvents.on('post:updated', () => this.refresh())
		extensionEvents.on('post:created', () => this.refresh())
		extensionEvents.on('post:published', () => this.refresh())
		extensionEvents.on('posts:refresh', () => this.refresh())
	}

	getTreeItem(element: Post): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(
			element.fields.title,
			vscode.TreeItemCollapsibleState.None,
		)
		treeItem.contextValue =
			element.fields.state === 'published' ? 'publishedPost' : 'unpublishedPost'
		treeItem.command = {
			command: 'course-builder-local.loadAndEditPost',
			title: 'Edit Post',
			arguments: [element],
		}

		// Add the status as a label
		treeItem.description = element.fields.state

		return treeItem
	}

	async getChildren(element?: Post): Promise<Post[]> {
		if (element) {
			return []
		} else {
			try {
				const storedTokenSet = this.context.globalState.get('tokenSet') as
					| TokenSet
					| undefined
				return await fetchPosts(storedTokenSet?.access_token)
			} catch (error) {
				console.log('Failed to fetch posts:', error)
				vscode.window.showErrorMessage('Failed to fetch posts')
				return []
			}
		}
	}
}
