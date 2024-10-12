// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'

import { createPost, fetchPosts, publishPost, updatePost } from './lib/posts'
// Add these new imports
import { PostsProvider } from './postsProvider'
import { Post, PostSchema } from './types'
import { PostCommands } from './commands/PostCommands'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(
		'Congratulations, your extension "course-builder-local" is now active!!!!!!',
	)

	// Command to create and edit a new post
	const createAndEditDisposable = vscode.commands.registerCommand(
		'course-builder-local.createAndEditPost',
		PostCommands.createAndEditPost,
	)

	// Command to load and edit an existing post
	const loadAndEditDisposable = vscode.commands.registerCommand(
		'course-builder-local.loadAndEditPost',
		(post?: Post) => PostCommands.loadAndEditPost(post),
	)

	// Add this new code to create and register the TreeDataProvider
	const postsProvider = new PostsProvider()
	vscode.window.registerTreeDataProvider('courseBuilderPosts', postsProvider)

	// Add a command to refresh the posts list
	const refreshPostsDisposable = vscode.commands.registerCommand(
		'course-builder-local.refreshPosts',
		() => postsProvider.refresh(),
	)

	// Add a command to publish a post
	const publishPostDisposable = vscode.commands.registerCommand(
		'course-builder-local.publishPost',
		async (post: Post) => {
			try {
				await publishPost(post)

				vscode.window.showInformationMessage(
					`Post published: ${post.fields.title}`,
				)
				postsProvider.refresh() // Refresh the tree view to update the post state
			} catch (error: any) {
				vscode.window.showErrorMessage(`Error: ${error.message}`)
			}
		},
	)

	const createNewPostDisposable = vscode.commands.registerCommand(
		'course-builder-local.createNewPost',
		() => PostCommands.createAndEditPost(postsProvider),
	)

	context.subscriptions.push(
		createAndEditDisposable,
		loadAndEditDisposable,
		refreshPostsDisposable,
		publishPostDisposable,
		createNewPostDisposable,
	)
}

// This method is called when your extension is deactivated
export function deactivate() {}
