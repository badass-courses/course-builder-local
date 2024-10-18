import * as vscode from 'vscode'
import matter from 'gray-matter'
import { URI } from 'vscode-uri'

import { createPost, fetchPosts, publishPost, updatePost } from '../lib/posts'
import { PostsProvider } from '../postsProvider'
import { Post } from '../types'
import { getAuthenticatedClient } from '../auth'
import { tokenForContext } from '../lib/token-for-context'
import { TEMP_SCHEME } from '../config'
import { extensionEvents } from '../lib/eventEmitter'

export class PostCommands {
	private static createFrontmatter(post: Post): string {
		return matter.stringify('', {
			title: post.fields.title,
		})
	}

	private static parseContent(content: string): { data: any; content: string } {
		return matter(content)
	}

	private static createTempUri(slug: string): vscode.Uri {
		const uri = vscode.Uri.parse(`${TEMP_SCHEME}:/${slug}.mdx`)
		console.log('Created temp URI:', uri.toString())
		return uri
	}

	private static async openTempDocument(
		uri: vscode.Uri,
		content: string,
	): Promise<vscode.TextDocument> {
		console.log('Opening temp document:', uri.toString())
		const encoder = new TextEncoder()
		await vscode.workspace.fs.writeFile(uri, encoder.encode(content))
		console.log('Wrote content to temp file')
		const document = await vscode.workspace.openTextDocument(uri)
		console.log('Opened temp document')
		return document
	}

	public static async createAndEditPost(postsProvider: PostsProvider) {
		console.log('Starting createAndEditPost')
		try {
			const token = tokenForContext(postsProvider.context)
			// Prompt for the new post title
			const title = await vscode.window.showInputBox({
				prompt: 'Enter the title for the new post',
				placeHolder: 'My New Post',
				validateInput: (value) => {
					if (value.length < 2 || value.length > 90) {
						return 'Title must be between 2 and 90 characters'
					}
					return null
				},
			})

			if (!title) {
				return // User cancelled the input
			}

			// Create the new post
			const newPost = await createPost(title, token)
			extensionEvents.emit('post:created', newPost)

			console.log('Created new post:', newPost)
			const tempUri = this.createTempUri(newPost.fields.slug)
			console.log('Creating temp file at URI:', tempUri.toString())
			const content =
				this.createFrontmatter(newPost) + (newPost.fields.body || '')

			console.log('Opening temp document')
			const document = await this.openTempDocument(tempUri, content)
			console.log('Showing text document')
			await vscode.window.showTextDocument(document)
			console.log('Text document shown')

			// Register a save listener for this document
			const saveDisposable = vscode.workspace.onDidSaveTextDocument(
				async (savedDocument) => {
					if (savedDocument.uri.toString() === tempUri.toString()) {
						const updatedContent = savedDocument.getText()
						const { data, content: updatedBody } =
							this.parseContent(updatedContent)

						const updatedPost = await updatePost(
							{
								id: newPost.id,
								fields: {
									title: data.title || newPost.fields.title,
									body: updatedBody,
								},
							},
							token,
						)

						if (updatedPost) {
							extensionEvents.emit('post:updated', updatedPost)
						}

						vscode.window.showInformationMessage(
							`Post updated: ${updatedPost.fields.title}`,
						)

						// Refresh the posts provider
						postsProvider.refresh()

						// Close the document the temporary file
						await vscode.commands.executeCommand(
							'workbench.action.closeActiveEditor',
						)

						// Dispose of the save listener
						saveDisposable.dispose()
					}
				},
			)

			// Show a success message
			vscode.window.showInformationMessage(
				`New post created: ${newPost.fields.title}`,
			)

			// Refresh the tree view if postsProvider is provided
			postsProvider.refresh()
		} catch (error: any) {
			console.error('Error in createAndEditPost:', error)
			vscode.window.showErrorMessage(`Error: ${error.message}`)
		}
	}

	public static async loadAndEditPost(
		context: vscode.ExtensionContext,
		postsProvider: PostsProvider,
		postOrUndefined?: Post,
	) {
		console.log({ postOrUndefined })
		try {
			const token = tokenForContext(context)
			let post: Post

			if (postOrUndefined) {
				post = postOrUndefined
			} else {
				const client = await getAuthenticatedClient(context)
				console.log({ client })

				const posts = await fetchPosts()
				const items = posts.map((p: Post) => ({
					label: p.fields.title,
					description: `ID: ${p.id}`,
					post: p,
				}))

				const selected = await vscode.window.showQuickPick(items, {
					placeHolder: 'Select a post to edit',
				})

				if (!selected) {
					return
				}

				post = selected.post
			}

			const tempUri = this.createTempUri(post.fields.slug)
			const content = this.createFrontmatter(post) + (post.fields.body || '')

			const document = await this.openTempDocument(tempUri, content)
			await vscode.window.showTextDocument(document)

			const saveDisposable = vscode.workspace.onDidSaveTextDocument(
				async (savedDocument) => {
					if (savedDocument.uri.toString() === tempUri.toString()) {
						const updatedContent = savedDocument.getText()
						const { data, content: updatedBody } =
							this.parseContent(updatedContent)

						const updatedPost = await updatePost(
							{
								id: post.id,
								fields: {
									title: data.title || post.fields.title,
									body: updatedBody,
								},
							},
							token,
						)

						if (updatedPost) {
							extensionEvents.emit('post:updated', updatedPost)
						}

						vscode.window.showInformationMessage(
							`Post updated: ${updatedPost.fields.title}`,
						)
						// Refresh the posts provider
						postsProvider.refresh()
					}
				},
			)

			// Clean up the temporary file when the editor is closed
			const closeListener = vscode.window.onDidChangeVisibleTextEditors(
				async (editors) => {
					if (
						!editors.some(
							(e) => e.document.uri.toString() === tempUri.toString(),
						)
					) {
						saveDisposable.dispose()
						closeListener.dispose()
					}
				},
			)
		} catch (error: any) {
			vscode.window.showErrorMessage(`Error: ${error.message}`)
		}
	}

	public static async publishPost(
		post: Post,
		context: vscode.ExtensionContext,
	) {
		try {
			const token = tokenForContext(context)
			await publishPost(post, token)
			extensionEvents.emit('post:published', post)

			vscode.window.showInformationMessage(
				`Post published: ${post.fields.title}`,
			)
			return true
		} catch (error: any) {
			vscode.window.showErrorMessage(`Error publishing post: ${error.message}`)
			return false
		}
	}
}
