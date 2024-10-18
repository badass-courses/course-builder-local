import { ExtensionContext, ExtensionMode, Uri } from 'vscode'

/**
 * Singleton class to provide access to the extension context
 * and other extension-related methods.
 */
export class Extension {
	private static instance: Extension
	private constructor(private ctx: ExtensionContext) {}

	public static getInstance(ctx?: ExtensionContext): Extension {
		if (!Extension.instance && ctx) {
			Extension.instance = new Extension(ctx)
		}

		return Extension.instance
	}

	/**
	 * Check if the extension is in production/development mode
	 */
	public get isProductionMode(): boolean {
		return this.ctx.extensionMode === ExtensionMode.Production
	}

	/**
	 * Get the path to the extension
	 */
	public get extensionPath(): Uri {
		return this.ctx.extensionUri
	}
}
