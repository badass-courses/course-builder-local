'use client'

import * as React from 'react'
import { useFileChange } from './use-file-change'
import { uploadToS3 } from './upload-to-s3'

const VideoUploadForm = ({
	postId,
	token,
}: {
	postId?: string
	token?: string | null
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
					signingUrl:
						'https://joel-x42.coursebuilder.dev/api/uploads/signed-url',
					token,
				})

				fileDispatch({ type: 'RESET_FILE_STATE' })
				setS3FileUrl(publicUrl)
				setIsUploading(false)

				await fetch('https://joel-x42.coursebuilder.dev/api/uploads/new', {
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

	return postId && token ? (
		<>
			<form onSubmit={handleSubmit}>
				<label htmlFor="video">Upload a video</label>
				<input
					type="file"
					accept="video/*"
					id="video"
					name="video"
					onChange={handleFileChange}
				/>
				<button disabled={!fileContents || isUploading} type="submit">
					Upload to Builder
				</button>
			</form>
			{fileError && <>{fileError}</>}
			{isUploading && (
				<div>
					<progress value={uploadProgress} max="100" />
					<span>{uploadProgress}%</span>
				</div>
			)}
			{s3FileUrl && <span className="inline-block h-96 w-96">{s3FileUrl}</span>}
		</>
	) : null
}

export default VideoUploadForm
