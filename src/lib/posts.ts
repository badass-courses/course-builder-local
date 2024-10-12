import { Post, PostSchema } from '../types'

// Update the fetchPosts function to be exported and reusable
export async function fetchPosts(): Promise<Post[]> {
	const response = await fetch('https://joel-x42.coursebuilder.dev/api/posts')
	if (!response.ok) {
		throw new Error(`Failed to fetch posts: ${response.statusText}`)
	}
	return response.ok ? PostSchema.array().parse(await response.json()) : []
}

export async function updatePost(post: {
	id: string
	fields: { title: string; body: string }
}): Promise<Post> {
	const response = await fetch(`https://joel-x42.coursebuilder.dev/api/posts`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(post),
	})

	if (!response.ok) {
		throw new Error(`Failed to update post: ${response.statusText}`)
	}

	return PostSchema.parse(await response.json())
}

export async function createPost(title: string): Promise<Post> {
	const response = await fetch('https://joel-x42.coursebuilder.dev/api/posts', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ title }),
	})

	if (!response.ok) {
		throw new Error(`Failed to create post: ${response.statusText}`)
	}

	return PostSchema.parse(await response.json())
}

export async function publishPost(post: Post): Promise<Post> {
	const response = await fetch(`https://joel-x42.coursebuilder.dev/api/posts`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			id: post.id,
			fields: {
				...post.fields,
				state: 'published',
			},
		}),
	})

	if (!response.ok) {
		throw new Error(`Failed to publish post: ${response.statusText}`)
	}

	return PostSchema.parse(await response.json())
}
