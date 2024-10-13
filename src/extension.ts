// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'
import { Issuer, Client, TokenSet } from 'openid-client'

import { createPost, fetchPosts, publishPost, updatePost } from './lib/posts'
// Add these new imports
import { PostsProvider } from './postsProvider'

import { Post, PostSchema } from './types'
import { PostCommands } from './commands/PostCommands'
import { authenticate, getAuthenticatedClient } from './auth'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(
		'Congratulations, your extension "course-builder-local" is now active;',
	)

	// Authenticate the user
	try {
		await authenticate(context)
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		vscode.window.showErrorMessage(`Authentication failed: ${errorMessage}`)
		return // Exit if authentication fails
	}

	// Command to create and edit a new post
	const createAndEditDisposable = vscode.commands.registerCommand(
		'course-builder-local.createAndEditPost',
		PostCommands.createAndEditPost,
	)

	// Command to load and edit an existing post
	const loadAndEditDisposable = vscode.commands.registerCommand(
		'course-builder-local.loadAndEditPost',
		(post?: Post) => PostCommands.loadAndEditPost(context, post),
	)

	// Add this new code to create and register the TreeDataProvider
	const postsProvider = new PostsProvider()

	vscode.window.registerTreeDataProvider('posts', postsProvider)

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

	// Example of using the authenticated client in a command
	const exampleAuthenticatedCommand = vscode.commands.registerCommand(
		'course-builder-local.exampleAuthenticatedCommand',
		async () => {
			try {
				const client = await getAuthenticatedClient(context)
const storedTokenSet = context.globalState.get('tokenSet') as
		| TokenSet
		| undefined
				console.log(client)

				client.userinfo(storedTokenSet).then((response) => {
					vscode.window.showInformationMessage(`Hello, ${response.name}!`)
				}
				// Use the client to make authenticated requests
				// For example:
				// const response = await client.userinfo();
				// vscode.window.showInformationMessage(`Hello, ${response.name}!`);
			} catch (error) {
				vscode.window.showErrorMessage(`Error: ${error.message}`)
			}
		},
	)

	context.subscriptions.push(
		createAndEditDisposable,
		loadAndEditDisposable,
		refreshPostsDisposable,
		publishPostDisposable,
		createNewPostDisposable,
		exampleAuthenticatedCommand,
	)
}

// This method is called when your extension is deactivated
export function deactivate() {}
