import axios from 'axios'

import { getUniqueFilename } from './get-unique-filename'

export async function uploadToS3({
	fileType,
	fileContents,
	onUploadProgress = () => {},
	signingUrl,
	token,
}: {
	fileType: string
	fileContents: File
	onUploadProgress: (progressEvent: { loaded: number; total?: number }) => void
	signingUrl: string
	token?: string | null
}) {
	const presignedPostUrl = await getPresignedPostUrl({
		fileType,
		fileName: fileContents.name,
		signingUrl,
		token,
	})

	await axios.put(presignedPostUrl.signedUrl, fileContents, {
		headers: { 'Content-Type': 'application/octet-stream' },
		onUploadProgress,
	})

	return presignedPostUrl
}

type PresignedPostUrlResponse = {
	signedUrl: string
	publicUrl: string
	filename: string
	objectName: string
}

async function getPresignedPostUrl({
	fileType,
	fileName,
	signingUrl,
	token,
}: {
	fileType: string
	fileName: string
	signingUrl: string
	token?: string | null
}) {
	const { data: presignedPostUrl } = await axios.get<PresignedPostUrlResponse>(
		`${signingUrl}?contentType=${fileType}&objectName=${getUniqueFilename(
			fileName,
		)}`,
	)

	return presignedPostUrl
}
