import { getBaseUrl } from '../config'
import { Post, PostSchema } from '../types'
import * as vscode from 'vscode'
import { logger } from '../utils/logger'

const baseUrl = getBaseUrl()
const apiUrl = `${baseUrl}/api`

// Update the fetchPosts function to be exported and reusable
export async function fetchPosts(token?: string): Promise<Post[]> {
	logger.debug('Fetching posts...')
	const url = `${baseUrl}/api/posts`
	logger.debug('Fetch URL:', url)

	try {
		logger.debug(
			'Making fetch request with token:',
			token ? 'exists' : 'does not exist',
		)
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		logger.debug('Fetch response status:', response.status)

		if (!response.ok) {
			logger.error('Failed to fetch posts. Status:', response.status)
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const data = await response.json()
		logger.debug('Fetched posts data:', data)

		return data
	} catch (error) {
		logger.error('Error fetching posts:', error)
		throw error
	}
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
