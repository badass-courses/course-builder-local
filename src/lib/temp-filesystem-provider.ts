import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { TEMP_SCHEME } from '../config'

export class TempFileSystemProvider implements vscode.FileSystemProvider {
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
	onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event

	private _baseDir: string

	constructor() {
		console.log('TempFileSystemProvider constructed')
		this._baseDir = path.join(os.homedir(), '.vscode-course-builder-temp')
		this.ensureBaseDir()
	}

	private ensureBaseDir() {
		if (!fs.existsSync(this._baseDir)) {
			fs.mkdirSync(this._baseDir, { recursive: true })
		}
	}

	// Add path validation
	private _getFilePath(uri: vscode.Uri): string {
		const normalized = path.normalize(path.join(this._baseDir, uri.path))
		// Prevent directory traversal attacks
		if (!normalized.startsWith(this._baseDir)) {
			throw vscode.FileSystemError.FileNotFound(uri)
		}
		return normalized
	}

	watch(uri: vscode.Uri): vscode.Disposable {
		console.log('Watch called for:', uri.toString())
		return new vscode.Disposable(() => {})
	}

	stat(uri: vscode.Uri): vscode.FileStat {
		try {
			this.ensureBaseDir()
			const filePath = this._getFilePath(uri)
			const stats = fs.statSync(filePath)
			return {
				type: stats.isFile() ? vscode.FileType.File : vscode.FileType.Directory,
				ctime: stats.ctime.getTime(),
				mtime: stats.mtime.getTime(),
				size: stats.size,
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				throw vscode.FileSystemError.FileNotFound(uri)
			}
			throw vscode.FileSystemError.Unavailable(uri)
		}
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
		console.log('ReadDirectory called for:', uri.toString())
		const dirPath = this._getFilePath(uri)
		return fs.readdirSync(dirPath).map((name) => {
			const filePath = path.join(dirPath, name)
			const stat = fs.statSync(filePath)
			return [
				name,
				stat.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
			]
		})
	}

	createDirectory(uri: vscode.Uri): void {
		console.log('CreateDirectory called for:', uri.toString())
		const dirPath = this._getFilePath(uri)
		fs.mkdirSync(dirPath, { recursive: true })
	}

	readFile(uri: vscode.Uri): Uint8Array {
		console.log('Attempting to read file:', uri.toString())
		const filePath = this._getFilePath(uri)
		return fs.readFileSync(filePath)
	}

	writeFile(
		uri: vscode.Uri,
		content: Uint8Array,
		options: { create: boolean; overwrite: boolean },
	): void {
		const filePath = this._getFilePath(uri)
		const tempPath = `${filePath}.tmp`

		try {
			// Write to temp file first
			fs.writeFileSync(tempPath, content)

			// Check if target exists when create=false or overwrite=false
			if ((!options.create || !options.overwrite) && fs.existsSync(filePath)) {
				fs.unlinkSync(tempPath)
				throw vscode.FileSystemError.FileExists(uri)
			}

			// Atomic rename
			fs.renameSync(tempPath, filePath)
			this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }])
		} catch (error) {
			// Clean up temp file if it exists
			try {
				fs.unlinkSync(tempPath)
			} catch {}

			if (
				(error as NodeJS.ErrnoException).code === 'ENOENT' &&
				!options.create
			) {
				throw vscode.FileSystemError.FileNotFound(uri)
			}
			throw error
		}
	}

	delete(uri: vscode.Uri, options?: { recursive?: boolean }): void {
		const filePath = this._getFilePath(uri)
		try {
			if (options?.recursive) {
				fs.rmSync(filePath, { recursive: true, force: true })
			} else {
				fs.unlinkSync(filePath)
			}
			this._emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }])
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				throw vscode.FileSystemError.FileNotFound(uri)
			}
			throw vscode.FileSystemError.Unavailable(uri)
		}
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri): void {
		console.log(
			'Renaming file from:',
			oldUri.toString(),
			'to:',
			newUri.toString(),
		)
		const oldPath = this._getFilePath(oldUri)
		const newPath = this._getFilePath(newUri)
		fs.renameSync(oldPath, newPath)
	}

	clearAll(): void {
		console.log('Clearing all temporary files')
		fs.rmdirSync(this._baseDir, { recursive: true })
		fs.mkdirSync(this._baseDir, { recursive: true })
		this._emitter.fire([
			{
				type: vscode.FileChangeType.Deleted,
				uri: vscode.Uri.parse(`${TEMP_SCHEME}:/`),
			},
		])
	}
}
