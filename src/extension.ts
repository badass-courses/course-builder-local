// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode'

import { PostsProvider } from './postsProvider'

import { Post } from './types'
import { PostCommands } from './commands/PostCommands'
import { authenticate } from './auth'

import { TempFileSystemProvider } from './lib/temp-filesystem-provider'
import { TEMP_SCHEME } from './config'
import { extensionEvents } from './lib/eventEmitter'

// Create the tempFileSystemProvider as a global variable
let tempFileSystemProvider: TempFileSystemProvider

// Register the file system provider immediately
tempFileSystemProvider = new TempFileSystemProvider()
vscode.workspace.registerFileSystemProvider(
	TEMP_SCHEME,
	tempFileSystemProvider,
	{ isCaseSensitive: true },
)

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Activating course-builder-local extension')

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
		() => PostCommands.createAndEditPost(postsProvider),
	)

	// Command to load and edit an existing post
	const loadAndEditDisposable = vscode.commands.registerCommand(
		'course-builder-local.loadAndEditPost',
		(post?: Post) => PostCommands.loadAndEditPost(context, postsProvider, post),
	)

	// Add this new code to create and register the TreeDataProvider
	const postsProvider = new PostsProvider(context)

	vscode.window.registerTreeDataProvider('posts', postsProvider)

	// Add a command to refresh the posts list
	const refreshPostsDisposable = vscode.commands.registerCommand(
		'course-builder-local.refreshPosts',
		() => extensionEvents.emit('posts:refresh'),
	)

	// Update the publishPost command
	const publishPostDisposable = vscode.commands.registerCommand(
		'course-builder-local.publishPost',
		async (post: Post) => {
			const success = await PostCommands.publishPost(post, context)
			if (success) {
				postsProvider.refresh() // Refresh the tree view to update the post state
			}
		},
	)

	const createNewPostDisposable = vscode.commands.registerCommand(
		'course-builder-local.createNewPost',
		() => PostCommands.createAndEditPost(postsProvider),
	)

	// Log all registered commands
	vscode.commands.getCommands(true).then((commands) => {
		console.log(
			'Registered commands:',
			commands.filter((cmd) => cmd.startsWith('course-builder-local')),
		)
	})

	// Add all disposables to context.subscriptions
	context.subscriptions.push(
		loadAndEditDisposable,
		refreshPostsDisposable,
		publishPostDisposable,
		createNewPostDisposable,
	)
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('Deactivating course-builder-local extension')
}
