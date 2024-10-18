import { getBaseUrl } from '../config'
import { Post, PostSchema } from '../types'
import * as vscode from 'vscode'

const baseUrl = getBaseUrl()
const apiUrl = `${baseUrl}/api`

// Update the fetchPosts function to be exported and reusable
export async function fetchPosts(token?: string): Promise<Post[]> {
	console.log('fetchPosts')
	const response = await fetch(`${apiUrl}/posts`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
	if (!response.ok) {
		console.error(`Failed to fetch posts: ${response.statusText}`)
		throw new Error(`Failed to fetch posts: ${response.statusText}`)
	}
	return response.ok ? PostSchema.array().parse(await response.json()) : []
}

export async function updatePost(
	post: {
		id: string
		fields: { title: string; body: string }
	},
	token: string | null,
): Promise<Post> {
	const response = await fetch(`${apiUrl}/posts`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(post),
	})

	if (!response.ok) {
		throw new Error(`Failed to update post: ${response.statusText}`)
	}

	return PostSchema.parse(await response.json())
}

export async function createPost(
	title: string,
	token: string | null,
): Promise<Post> {
	const response = await fetch(`${apiUrl}/posts`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({ title }),
	})

	if (!response.ok) {
		throw new Error(`Failed to create post: ${response.statusText}`)
	}

	return PostSchema.parse(await response.json())
}

export async function publishPost(
	post: Post,
	token: string | null,
): Promise<Post> {
	const response = await fetch(`${apiUrl}/posts`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
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
