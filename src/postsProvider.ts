import * as vscode from 'vscode'

import { Post } from './types'
import { fetchPosts } from './lib/posts'
import { type TokenSet } from 'openid-client'
import { extensionEvents } from './lib/eventEmitter'
import { PostsDetailProvider } from './postsDetailProvider'
import { logger } from './utils/logger'

export class PostsProvider implements vscode.TreeDataProvider<Post> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		Post | undefined | null | void
	> = new vscode.EventEmitter<Post | undefined | null | void>()
	readonly onDidChangeTreeData: vscode.Event<Post | undefined | null | void> =
		this._onDidChangeTreeData.event

	context: vscode.ExtensionContext
	postsDetailProvider: PostsDetailProvider

	constructor(
		context: vscode.ExtensionContext,
		postsDetailProvider: PostsDetailProvider,
	) {
		logger.debug('PostsProvider constructor called')
		this.context = context
		this.postsDetailProvider = postsDetailProvider
		extensionEvents.on('post:updated', () => this.refresh())
		extensionEvents.on('post:created', () => this.refresh())
		extensionEvents.on('post:published', () => this.refresh())
		extensionEvents.on('posts:refresh', () => this.refresh())

		// Add this line to trigger an initial refresh
		this.refresh()
	}

	refresh(): void {
		logger.debug('PostsProvider refresh called')
		this._onDidChangeTreeData.fire(undefined)
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
				const posts = await fetchPosts(storedTokenSet.access_token)
				logger.info(`Fetched ${posts.length} posts`)

				if (posts.length === 0) {
					logger.warn('No posts fetched')
				} else {
					logger.debug('First post:', posts[0])
				}

				return posts
			} catch (error) {
				logger.error('Failed to fetch posts:', error)
				vscode.window.showErrorMessage('Failed to fetch posts')
				return []
			}
		}
	}
}
