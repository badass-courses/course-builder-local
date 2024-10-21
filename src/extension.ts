// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode'

import { PostsProvider } from './postsProvider'
import { PostsDetailProvider } from './postsDetailProvider'

import { Post } from './types'
import { PostCommands } from './commands/PostCommands'
import { authenticate, logout, clearAuth } from './auth'

import { TempFileSystemProvider } from './lib/temp-filesystem-provider'
import { TEMP_SCHEME } from './config'
import { extensionEvents } from './lib/eventEmitter'
import { Extension } from './helpers/Extension'
import { logger } from './utils/logger'
import { AuthProvider } from './authProvider'
import { tokenForContext } from './lib/token-for-context'

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
	const extension = Extension.getInstance(context)

	// Initialize the logger
	logger.initialize(context)

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	logger.info('Activating course-builder-local extension')

	// Create AuthProvider
	logger.debug('Creating AuthProvider')
	const authProvider = new AuthProvider(context)
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('authView', authProvider),
	)

	logger.debug('AuthProvider created')

	// Function to update authentication state and view visibility
	const updateAuthState = (isAuthenticated: boolean) => {
		logger.debug(`Updating auth state: ${isAuthenticated}`)
		vscode.commands.executeCommand(
			'setContext',
			'course-builder-local:authenticated',
			isAuthenticated,
		)
		if (isAuthenticated) {
			logger.debug('Showing course-builder view')
			vscode.commands.executeCommand('workbench.view.extension.course-builder')
		} else {
			logger.debug('Focusing authView')
			vscode.commands.executeCommand('authView.focus')
		}
	}

	// Function to attempt authentication
	const attemptAuthentication = async (retryCount = 0): Promise<boolean> => {
		try {
			logger.debug(
				`Attempting to authenticate user... (Attempt ${retryCount + 1})`,
			)
			await authenticate(context)
			logger.info('User authenticated successfully')
			return true
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			logger.error(`Authentication failed: ${errorMessage}`)

			if (retryCount < 5) {
				logger.warn('Authentication failed. Clearing auth and retrying...')
				await clearAuth(context)
				return attemptAuthentication(retryCount + 1)
			} else {
				vscode.window.showErrorMessage(
					`Authentication failed: ${errorMessage}. Please try logging in manually.`,
				)
				return false
			}
		}
	}

	// Attempt authentication
	const token = tokenForContext(context)
	const isAuthenticated = token ? true : false

	// Update auth state and view visibility
	updateAuthState(isAuthenticated)

	logger.debug(`****** isAuthenticated: ${isAuthenticated}`)

	// Command to create and edit a new post
	const createAndEditDisposable = vscode.commands.registerCommand(
		'course-builder-local.createAndEditPost',
		() => PostCommands.createAndEditPost(postsProvider),
	)

	// Command to load and edit an existing post
	const loadAndEditDisposable = vscode.commands.registerCommand(
		'course-builder-local.loadAndEditPost',
		(post?: Post) => {
			PostCommands.loadAndEditPost(context, postsProvider, post)
			postsDetailProvider.refresh(post)
		},
	)

	// Create and register PostsDetailProvider
	logger.debug('Creating PostsDetailProvider')
	const postsDetailProvider = new PostsDetailProvider(context)
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'postsDetail',
			postsDetailProvider,
		),
	)

	// Create PostsProvider with postsDetailProvider
	logger.debug('Creating PostsProvider')
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

	// Add all disposables to context.subscriptions
	context.subscriptions.push(
		loadAndEditDisposable,
		refreshPostsDisposable,
		publishPostDisposable,
		createNewPostDisposable,
	)

	// Update the selectPost command
	const selectPostDisposable = vscode.commands.registerCommand(
		'course-builder-local.selectPost',
		(post: Post) => {
			postsDetailProvider.refresh(post)
		},
	)

	// Add the new disposable to context.subscriptions
	context.subscriptions.push(selectPostDisposable)

	// Register the combined selectAndShowPostDetail command
	const selectAndShowPostDetailDisposable = vscode.commands.registerCommand(
		'course-builder-local.selectAndShowPostDetail',
		(post: Post) => {
			postsDetailProvider.refresh(post)
			vscode.commands.executeCommand('postsDetail.focus')
		},
	)

	// Add the new disposable to context.subscriptions
	context.subscriptions.push(selectAndShowPostDetailDisposable)

	// Register the logout command
	const logoutDisposable = vscode.commands.registerCommand(
		'course-builder-local.logout',
		async () => {
			await logout(context)
			updateAuthState(false)
			// After logout, you might want to clear or refresh certain UI elements
			postsProvider.refresh()
			postsDetailProvider.refresh()
		},
	)

	// Add the logout disposable to context.subscriptions
	context.subscriptions.push(logoutDisposable)

	// Update the authenticate command
	const authenticateDisposable = vscode.commands.registerCommand(
		'course-builder-local.authenticate',
		async () => {
			const success = await attemptAuthentication()
			updateAuthState(success)
			if (success) {
				// Refresh necessary views
				// ... (add code to refresh views)
			}
		},
	)

	// Add the authenticate disposable to context.subscriptions
	context.subscriptions.push(authenticateDisposable)

	// Log all registered commands
	vscode.commands.getCommands(true).then((commands) => {
		logger.debug(
			'Registered commands:',
			commands.filter((cmd) => cmd.startsWith('course-builder-local')),
		)
	})

	logger.info('course-builder-local extension activated successfully')

	const showPostsViewDisposable = vscode.commands.registerCommand(
		'course-builder-local.showPostsView',
		() => {
			vscode.commands.executeCommand('workbench.view.extension.course-builder')
		},
	)
	context.subscriptions.push(showPostsViewDisposable)

	// Register the clearAuth command
	const clearAuthDisposable = vscode.commands.registerCommand(
		'course-builder-local.clearAuth',
		async () => {
			await clearAuth(context)
			postsProvider.refresh()
			postsDetailProvider.refresh()
		},
	)

	// Add the clearAuth disposable to context.subscriptions
	context.subscriptions.push(clearAuthDisposable)

	// At the end of the activate function
	vscode.commands.executeCommand('course-builder-local.showPostsView')

	const showAuthViewDisposable = vscode.commands.registerCommand(
		'course-builder-local.showAuthView',
		() => {
			vscode.commands.executeCommand('workbench.view.extension.course-builder')
			vscode.commands.executeCommand('authView.focus')
		},
	)
	context.subscriptions.push(showAuthViewDisposable)

	if (isAuthenticated) {
	} else {
		logger.debug('User not authenticated, focusing authView')
		// Show auth view when not authenticated
		await vscode.commands.executeCommand(
			'workbench.view.extension.course-builder',
		)
		await vscode.commands.executeCommand('authView.focus')
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	logger.info('Deactivating course-builder-local extension')
}
