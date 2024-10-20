import { getBaseUrl } from '../config'
import { Post, PostSchema } from '../types'
import * as vscode from 'vscode'
import { logger } from '../utils/logger'
import { TEMP_SCHEME } from '../config'
import matter from 'gray-matter'

const baseUrl = getBaseUrl()
const apiUrl = `${baseUrl}/api`
const POSTS_JSON_FILE = 'posts.json'

async function isOnline(): Promise<boolean> {
	try {
		await fetch(baseUrl, { method: 'HEAD' })
		return true
	} catch (error) {
		return false
	}
}

export async function fetchPosts(
	token?: string | null,
	context?: vscode.ExtensionContext,
): Promise<{ posts: Post[]; source: 'cache' | 'api' }> {
	logger.debug('Fetching posts...')

	// If online or no cached posts, fetch from API
	return fetchFromApiAndCache(token, context)
}

async function fetchFromApiAndCache(
	token?: string | null,
	context?: vscode.ExtensionContext,
): Promise<{ posts: Post[]; source: 'api' }> {
	const url = `${baseUrl}/api/posts`
	logger.debug('Fetch URL:', url)

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})

	if (!response.ok) {
		logger.warn('Failed to fetch posts from API. Status:', response.status)
		throw new Error(`HTTP error! status: ${response.status}`)
	}

	const data = await response.json()
	logger.debug('Fetched posts data from API:', data)

	// Cache the fetched posts as JSON and MDX files
	if (context) {
		await cachePostsAsJson(data, context)
		await cachePostsAsMdx(data, context)
		logger.debug('Cached posts as JSON and MDX files')
	}

	return { posts: data, source: 'api' }
}

async function cachePostsAsJson(
	posts: Post[],
	context: vscode.ExtensionContext,
): Promise<void> {
	const uri = vscode.Uri.parse(`${TEMP_SCHEME}:/${POSTS_JSON_FILE}`)
	await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(posts)))
}

async function cachePostsAsMdx(
	posts: Post[],
	context: vscode.ExtensionContext,
): Promise<void> {
	for (const post of posts) {
		const uri = vscode.Uri.parse(`${TEMP_SCHEME}:/${post.fields.slug}.mdx`)
		const content = matter.stringify(post.fields.body || '', {
			title: post.fields.title,
		})
		await vscode.workspace.fs.writeFile(uri, Buffer.from(content))
	}
}

async function loadCachedPostsFromJson(
	context: vscode.ExtensionContext,
): Promise<Post[]> {
	const uri = vscode.Uri.parse(`${TEMP_SCHEME}:/${POSTS_JSON_FILE}`)
	try {
		const content = await vscode.workspace.fs.readFile(uri)
		return JSON.parse(content.toString()) as Post[]
	} catch (error) {
		logger.warn('Failed to load cached posts from JSON:', error)
		return []
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
