import * as vscode from 'vscode'
import { Extension } from './helpers/Extension'

export const TEMP_SCHEME = 'builder'

export function getConfig() {
	return vscode.workspace.getConfiguration('courseBuilderLocal')
}

export function getBaseUrl(): string {
	// const isProd = Extension.getInstance().isProductionMode
	return 'https://builder.egghead.io'
	// return getConfig().get('baseUrl') || isProd
	// 	? 'https://builder.egghead.io'
	// 	: 'https://joel-x42.coursebuilder.dev'
}
