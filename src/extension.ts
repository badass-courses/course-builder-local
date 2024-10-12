// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "course-builder-local" is now active!!!!!!');

	// Command to create and edit a new post
	const createAndEditDisposable = vscode.commands.registerCommand('course-builder-local.createAndEditPost', createAndEditPost);

	// Command to load and edit an existing post
	const loadAndEditDisposable = vscode.commands.registerCommand('course-builder-local.loadAndEditPost', loadAndEditPost);

	context.subscriptions.push(createAndEditDisposable, loadAndEditDisposable);
}

async function createAndEditPost() {
	try {
		// Prompt for the new post title
		const title = await vscode.window.showInputBox({
			prompt: 'Enter the title for the new post',
			placeHolder: 'My New Post',
			validateInput: (value) => {
				if (value.length < 2 || value.length > 90) {
					return 'Title must be between 2 and 90 characters';
				}
				return null;
			}
		});

		if (!title) {
			return; // User cancelled the input
		}

		// Create the new post
		const response = await fetch('https://joel-x42.coursebuilder.dev/api/posts', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ title })
		});

		if (!response.ok) {
			throw new Error(`Failed to create post: ${response.statusText}`);
		}

		const newPost: any = await response.json();

		// Create a temporary file for editing the body
		const tmpDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath || os.tmpdir();
		const tmpFile = path.join(tmpDir, `post_${newPost.id}_body.md`);

		// Write the current body (if any) to the temporary file
		fs.writeFileSync(tmpFile, newPost.fields.body || '');

		// Open the temporary file in the editor
		const document = await vscode.workspace.openTextDocument(tmpFile);
		const editor = await vscode.window.showTextDocument(document);

		// Register a save listener for this document
		const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (savedDocument) => {
			if (savedDocument.uri.fsPath === tmpFile) {
				const updatedBody = savedDocument.getText();

				// Update the post with the new body
				const updateResponse = await fetch(`https://joel-x42.coursebuilder.dev/api/posts`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						id: newPost.id,
						fields: {
							body: updatedBody,
							title: newPost.fields.title
						}
					})
				});

				if (!updateResponse.ok) {
					throw new Error(`Failed to update post: ${updateResponse.statusText}`);
				}

				vscode.window.showInformationMessage(`Post updated: ${newPost.fields.title}`);
				
				// Optionally, close the document and delete the temporary file
				await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				fs.unlinkSync(tmpFile);
				
				// Dispose of the save listener
				saveDisposable.dispose();
			}
		});

	} catch (error: any) {
		vscode.window.showErrorMessage(`Error: ${error.message}`);
	}
}

async function loadAndEditPost() {
	try {
		// Fetch posts from the API
		const response = await fetch('https://joel-x42.coursebuilder.dev/api/posts');
		if (!response.ok) {
			throw new Error(`Failed to fetch posts: ${response.statusText}`);
		}
		const posts: any = await response.json();

		// Create QuickPick items from posts
		const items = posts.map((post: any) => ({
			label: post.fields.title,
			description: `ID: ${post.id}`,
			post: post
		}));

		// Show QuickPick to select a post
		const selected:any = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a post to edit'
		});

		if (!selected) {
			return; // User cancelled the selection
		}

		const post = selected.post;

		// Create a temporary file for editing
		const tmpDir = vscode.workspace.workspaceFolders?.[0].uri.fsPath || os.tmpdir();
		const tmpFile = path.join(tmpDir, `post_${post.id}_body.md`);

		// Write the current body to the temporary file
		fs.writeFileSync(tmpFile, post.fields.body || '');

		// Open the temporary file in the editor
		const document = await vscode.workspace.openTextDocument(tmpFile);
		const editor = await vscode.window.showTextDocument(document);

		// Register a save listener for this document
		const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (savedDocument) => {
			if (savedDocument.uri.fsPath === tmpFile) {
				const updatedBody = savedDocument.getText();

				// Update the post with the new body
				const updateResponse = await fetch(`https://joel-x42.coursebuilder.dev/api/posts`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						id: post.id,
						fields: {
							body: updatedBody,
							title: post.fields.title
						}
					})
				});

				if (!updateResponse.ok) {
					throw new Error(`Failed to update post: ${updateResponse.statusText}`);
				}

				vscode.window.showInformationMessage(`Post updated: ${post.fields.title}`);
				
				// Optionally, close the document and delete the temporary file
				await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				fs.unlinkSync(tmpFile);
				
				// Dispose of the save listener
				saveDisposable.dispose();
			}
		});

	} catch (error: any) {
		vscode.window.showErrorMessage(`Error: ${error.message}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
