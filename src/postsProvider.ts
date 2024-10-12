import * as vscode from 'vscode'

import { Post } from './types'
import { fetchPosts } from './lib/posts'

export class PostsProvider implements vscode.TreeDataProvider<Post> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		Post | undefined | null | void
	> = new vscode.EventEmitter<Post | undefined | null | void>()
	readonly onDidChangeTreeData: vscode.Event<Post | undefined | null | void> =
		this._onDidChangeTreeData.event

	refresh(): void {
		this._onDidChangeTreeData.fire()
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
		return treeItem
	}

	async getChildren(element?: Post): Promise<Post[]> {
		if (element) {
			return []
		} else {
			try {
				return await fetchPosts()
			} catch (error) {
				vscode.window.showErrorMessage('Failed to fetch posts')
				return []
			}
		}
	}
}
