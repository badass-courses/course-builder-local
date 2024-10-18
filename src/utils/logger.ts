import * as vscode from 'vscode'
import { Extension } from '../helpers/Extension'

enum LogLevel {
	DEBUG,
	INFO,
	WARN,
	ERROR,
}

class Logger {
	private static instance: Logger
	private outputChannel: vscode.OutputChannel
	private logLevel: LogLevel

	private constructor() {
		this.outputChannel = vscode.window.createOutputChannel('Course Builder')
		this.logLevel = LogLevel.DEBUG // Default to DEBUG, will be set properly during initialization
	}

	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger()
		}
		return Logger.instance
	}

	public initialize(context: vscode.ExtensionContext) {
		// this.logLevel = Extension.getInstance(context).isProductionMode
		// 	? LogLevel.INFO
		// 	: LogLevel.DEBUG
		this.info('Logger initialized')
	}

	private log(level: LogLevel, message: string, ...args: any[]): void {
		if (level >= this.logLevel) {
			const formattedMessage = `[${LogLevel[level]}] ${message}`
			this.outputChannel.appendLine(formattedMessage)
			console.log(formattedMessage)
			if (args.length > 0) {
				this.outputChannel.appendLine(JSON.stringify(args, null, 2))
				console.dir(args, { depth: null })
			}
		}
	}

	debug(message: string, ...args: any[]): void {
		this.log(LogLevel.DEBUG, message, ...args)
	}

	info(message: string, ...args: any[]): void {
		this.log(LogLevel.INFO, message, ...args)
	}

	warn(message: string, ...args: any[]): void {
		this.log(LogLevel.WARN, message, ...args)
	}

	error(message: string, ...args: any[]): void {
		this.log(LogLevel.ERROR, message, ...args)
	}

	show(): void {
		this.outputChannel.show()
	}
}

export const logger = Logger.getInstance()
