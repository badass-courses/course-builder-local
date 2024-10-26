import { z } from 'zod'

export const VideoResourceSchema = z.object({
	id: z.string(),
	duration: z.number().nullable(),
	muxAssetId: z.string().nullable(),
	muxPlaybackId: z.string().nullable(),
	state: z.enum([
		'new',
		'processing',
		'preparing',
		'ready',
		'errored',
		'deleted',
	]),
	transcript: z.string().nullable(),
})

export type VideoResource = z.infer<typeof VideoResourceSchema>
