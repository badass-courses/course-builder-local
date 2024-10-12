import * as vscode from 'vscode'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { createPost, fetchPosts, publishPost, updatePost } from '../lib/posts'
import { PostsProvider } from '../postsProvider'
import { Post } from '../types'

export class PostCommands {
	public static async createAndEditPost(postsProvider?: PostsProvider) {
		try {
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
			const newPost = await createPost(title)

			// Create a temporary file for editing the body
			const tmpDir =
				vscode.workspace.workspaceFolders?.[0].uri.fsPath || os.tmpdir()
			const tmpFile = path.join(tmpDir, `${newPost.fields.slug}.mdx`)

			// Write the current body (if any) to the temporary file
			fs.writeFileSync(tmpFile, newPost.fields.body || '')

			// Open the temporary file in the editor
			const document = await vscode.workspace.openTextDocument(tmpFile)
			await vscode.window.showTextDocument(document)

			// Register a save listener for this document
			const saveDisposable = vscode.workspace.onDidSaveTextDocument(
				async (savedDocument) => {
					if (savedDocument.uri.fsPath === tmpFile) {
						const updatedBody = savedDocument.getText()

						const updatedPost = await updatePost({
							id: newPost.id,
							fields: { title: newPost.fields.title, body: updatedBody },
						})

						if (!updatedPost) {
							throw new Error(`Failed to update post.`)
						}

						vscode.window.showInformationMessage(
							`Post updated: ${newPost.fields.title}`,
						)

						// Close the document and delete the temporary file
						await vscode.commands.executeCommand(
							'workbench.action.closeActiveEditor',
						)
						fs.unlinkSync(tmpFile)

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
			if (postsProvider) {
				postsProvider.refresh()
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Error: ${error.message}`)
		}
	}

	public static async loadAndEditPost(postOrUndefined?: Post) {
		try {
			let post: Post

			if (postOrUndefined) {
				post = postOrUndefined
			} else {
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

			const tmpDir =
				vscode.workspace.workspaceFolders?.[0].uri.fsPath || os.tmpdir()
			const tmpFile = path.join(tmpDir, `${post.fields.slug}.mdx`)

			fs.writeFileSync(tmpFile, post.fields.body || '')

			const document = await vscode.workspace.openTextDocument(tmpFile)
			await vscode.window.showTextDocument(document)

			const saveDisposable = vscode.workspace.onDidSaveTextDocument(
				async (savedDocument) => {
					if (savedDocument.uri.fsPath === tmpFile) {
						const updatedBody = savedDocument.getText()

						const updatedPost = await updatePost({
							id: post.id,
							fields: { title: post.fields.title, body: updatedBody },
						})
						vscode.window.showInformationMessage(
							`Post updated: ${post.fields.title}`,
						)
					}
				},
			)

			// Clean up the temporary file when the editor is closed
			const closeListener = vscode.window.onDidChangeVisibleTextEditors(
				(editors) => {
					if (!editors.some((e) => e.document.uri.fsPath === tmpFile)) {
						saveDisposable.dispose()
						closeListener.dispose()
						fs.unlinkSync(tmpFile)
					}
				},
			)
		} catch (error: any) {
			vscode.window.showErrorMessage(`Error: ${error.message}`)
		}
	}
}
