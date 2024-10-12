import z from 'zod'

export const PostSchema = z.object({
	id: z.string(),
	fields: z.object({
		title: z.string(),
		body: z.string(),
		slug: z.string(),
		state: z.string().optional(),
	}),
})

export type Post = z.infer<typeof PostSchema>
