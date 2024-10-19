import * as vscode from 'vscode'

import { Post } from './types'
import { fetchPosts } from './lib/posts'
import { type TokenSet } from 'openid-client'
import { extensionEvents } from './lib/eventEmitter'
import { logger } from './utils/logger'
import { TEMP_SCHEME } from './config'

export class PostsProvider implements vscode.TreeDataProvider<Post> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		Post | undefined | null | void
	> = new vscode.EventEmitter<Post | undefined | null | void>()
	readonly onDidChangeTreeData: vscode.Event<Post | undefined | null | void> =
		this._onDidChangeTreeData.event

	context: vscode.ExtensionContext

	constructor(context: vscode.ExtensionContext) {
		logger.debug('PostsProvider constructor called')
		this.context = context

		extensionEvents.on('post:updated', () => this.refresh())
		extensionEvents.on('post:created', () => this.refresh())
		extensionEvents.on('post:published', () => this.refresh())
		extensionEvents.on('posts:refresh', () => this.refresh())

		// Add this line to trigger an initial refresh
		this.refresh()
	}

	refresh(): void {
		logger.debug('PostsProvider refresh called')
		// Clear the cache when manually refreshing
		const tempUri = vscode.Uri.parse(`${TEMP_SCHEME}:/`)
		vscode.workspace.fs.readDirectory(tempUri).then((files) => {
			files.forEach(([name, type]) => {
				if (
					type === vscode.FileType.File &&
					(name.endsWith('.mdx') || name === 'posts.json')
				) {
					vscode.workspace.fs.delete(
						vscode.Uri.parse(`${TEMP_SCHEME}:/${name}`),
					)
				}
			})
			this._onDidChangeTreeData.fire(undefined)
		})
	}

	getTreeItem(element: Post): vscode.TreeItem {
		logger.debug('PostsProvider getTreeItem called', element)
		if (element.id === 'login') {
			const treeItem = new vscode.TreeItem(
				element.fields.title,
				vscode.TreeItemCollapsibleState.None,
			)
			treeItem.command = {
				command: 'course-builder-local.authenticate',
				title: 'Login',
			}
			return treeItem
		}

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
		logger.debug('PostsProvider getChildren called', { element })
		if (element) {
			logger.debug('Element provided, returning empty array')
			return []
		} else {
			try {
				logger.debug('Attempting to get stored token set')
				const storedTokenSet = this.context.globalState.get('tokenSet') as
					| TokenSet
					| undefined

				logger.debug(
					'Stored token set:',
					storedTokenSet ? 'exists' : 'does not exist',
				)

				if (!storedTokenSet) {
					logger.info('User is not authenticated, returning login item')
					return [{ id: 'login', fields: { title: 'Click to login' } } as Post]
				}

				logger.debug('Fetching posts...')
				const { posts, source } = await fetchPosts(
					storedTokenSet.access_token,
					this.context,
				)
				logger.info(`Fetched ${posts.length} posts from ${source}`)

				if (posts.length === 0) {
					logger.warn('No posts fetched')
				} else {
					logger.debug('First post:', posts[0])
				}

				if (source === 'cache') {
					// If posts were loaded from cache, trigger a refresh to fetch from API
					setImmediate(() => this._onDidChangeTreeData.fire(undefined))
				}

				return posts
			} catch (error) {
				logger.error('Failed to fetch posts:', error)
				vscode.window.showErrorMessage(
					'Failed to fetch posts. Working with cached data if available.',
				)

				return []
			}
		}
	}
}
