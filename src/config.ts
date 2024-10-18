import * as vscode from 'vscode'

export const TEMP_SCHEME = 'builder'

export function getConfig() {
	return vscode.workspace.getConfiguration('courseBuilderLocal')
}

export function getBaseUrl(): string {
	return getConfig().get('baseUrl') || 'https://joel-x42.coursebuilder.dev'
}
