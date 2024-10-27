'use client'

import * as React from 'react'
import { useFileChange } from './use-file-change'
import { uploadToS3 } from './upload-to-s3'
import { Button, Progress } from '@coursebuilder/ui'

const VideoUploadForm = ({
	postId,
	token,
	apiUrl,
	isReplacement,
	onUploaded,
	onProgress = () => {},
	onCancel,
}: {
	postId?: string
	token?: string | null
	apiUrl: string | null
	isReplacement: boolean
	onUploaded: (videoId: string) => void
	onProgress?: (progress: number) => void
	onCancel?: () => void
}) => {
	const {
		fileError,
		fileName,
		fileContents,
		fileType,
		fileDispatch,
		handleFileChange,
	} = useFileChange()
	const [uploadProgress, setUploadProgress] = React.useState(0)
	const [isUploading, setIsUploading] = React.useState(false)

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		try {
			if (fileType && fileContents) {
				setIsUploading(true)
				setUploadProgress(0)
				const { publicUrl, objectName } = await uploadToS3({
					fileType,
					fileContents,
					onUploadProgress: (progressEvent) => {
						const progress = progressEvent.total
							? Math.round((progressEvent.loaded / progressEvent.total) * 100)
							: 0
						setUploadProgress(progress)
						onProgress(progress)
					},
					signingUrl: `${apiUrl}/api/uploads/signed-url`,
					token,
				})

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
				onUploaded(objectName)
			}
		} catch (err) {
			console.log('error is', err)
			setIsUploading(false)
		}
	}

	if (!postId || !token || !apiUrl) return null

	if (isUploading) {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center space-y-6">
				<div className="w-full max-w-md space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Uploading {fileName}</span>
						<span className="text-muted-foreground text-sm">
							{uploadProgress}%
						</span>
					</div>
					<Progress value={uploadProgress} className="h-2" />
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center">
			<div className="w-full max-w-md space-y-6">
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="relative">
						<Button
							type="button"
							variant="outline"
							className="relative w-full overflow-hidden px-6 py-2"
						>
							<input
								type="file"
								accept="video/*"
								id="video"
								name="video"
								onChange={handleFileChange}
								className="absolute inset-0 cursor-pointer opacity-0"
							/>
							{fileName ||
								(isReplacement ? 'Select new video' : 'Select video')}
						</Button>
					</div>

					{fileName && !fileError && (
						<div className="flex gap-3">
							<Button
								type="submit"
								className="bg-primary hover:bg-primary/90 flex-1 px-6 py-2"
							>
								Upload
							</Button>
							{isReplacement && onCancel && (
								<Button
									type="button"
									variant="outline"
									onClick={onCancel}
									className="hover:bg-secondary/10 border-2 px-6 py-2"
								>
									Cancel
								</Button>
							)}
						</div>
					)}
				</form>

				{fileError && (
					<div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
						{fileError}
					</div>
				)}
			</div>
		</div>
	)
}

export default VideoUploadForm
