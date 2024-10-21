'use client'

import * as React from 'react'
import { useFileChange } from './use-file-change'
import { uploadToS3 } from './upload-to-s3'

const VideoUploadForm = ({
	postId,
	token,
	apiUrl,
	isReplacement,
}: {
	postId?: string
	token?: string | null
	apiUrl: string | null
	isReplacement: boolean
}) => {
	const {
		fileError,
		fileName,
		fileContents,
		fileType,
		fileDispatch,
		handleFileChange,
	} = useFileChange()
	const [s3FileUrl, setS3FileUrl] = React.useState('')
	const [uploadProgress, setUploadProgress] = React.useState(0)
	const [isUploading, setIsUploading] = React.useState(false)

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		try {
			if (fileType && fileContents) {
				setIsUploading(true)
				setUploadProgress(0)
				const { publicUrl, filename, objectName } = await uploadToS3({
					fileType,
					fileContents,
					onUploadProgress: (progressEvent) => {
						const progress = progressEvent.total
							? Math.round((progressEvent.loaded / progressEvent.total) * 100)
							: 0
						setUploadProgress(progress)
					},
					signingUrl: `${apiUrl}/api/uploads/signed-url`,
					token,
				})

				fileDispatch({ type: 'RESET_FILE_STATE' })
				setS3FileUrl(publicUrl)
				setIsUploading(false)

				await fetch(`${apiUrl}/api/uploads/new`, {
					method: 'POST',
					body: JSON.stringify({
						file: {
							url: publicUrl,
							name: objectName,
						},
						metadata: {
							parentResourceId: postId,
						},
					}),
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})
			}
		} catch (err) {
			console.log('error is', err)
			setIsUploading(false)
		}
	}

	return postId && token && apiUrl ? (
		<div className="bg-vscode-editor p-4 text-vscode-foreground">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="video" className="mb-2 block font-semibold">
						{isReplacement ? 'Replace video' : 'Upload a video'}
					</label>
					<div className="relative">
						<input
							type="file"
							accept="video/*"
							id="video"
							name="video"
							onChange={handleFileChange}
							className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
						/>
						<div className="rounded border border-vscode-button-border bg-vscode-button-background px-4 py-2 text-vscode-button-foreground">
							{fileName || 'Choose file...'}
						</div>
					</div>
				</div>
				<button
					disabled={!fileContents || isUploading}
					type="submit"
					className={`w-full rounded px-4 py-2 ${
						!fileContents || isUploading
							? 'cursor-not-allowed bg-vscode-button-background opacity-50'
							: 'bg-vscode-button-background hover:bg-vscode-button-hoverBackground'
					} text-vscode-button-foreground`}
				>
					{isUploading ? 'Uploading...' : 'Upload to Builder'}
				</button>
			</form>
			{fileError && (
				<div className="mt-4 text-vscode-errorForeground">{fileError}</div>
			)}
			{isUploading && (
				<div className="mt-4">
					<div className="h-2.5 w-full rounded-full bg-vscode-progressBar-background">
						<div
							className="h-2.5 rounded-full bg-vscode-progressBar-foreground transition-all duration-300 ease-in-out"
							style={{ width: `${uploadProgress}%` }}
						></div>
					</div>
					<span className="mt-1 inline-block text-sm">{uploadProgress}%</span>
				</div>
			)}
			{s3FileUrl && (
				<div className="mt-4 space-y-2">
					<span className="block">Upload successful!</span>
					<a
						href={s3FileUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-vscode-textLink-foreground hover:underline"
					>
						View uploaded video
					</a>
				</div>
			)}
		</div>
	) : null
}

export default VideoUploadForm
