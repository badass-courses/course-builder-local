import * as React from 'react'
import { createRoot } from 'react-dom/client'
import usePartySocket from 'partysocket/react'
import VideoUploadForm from '../video-upload/video-upload-form'
import MuxPlayer from '@mux/mux-player-react/lazy'
import {
	useQuery,
	useMutation,
	useQueryClient,
	QueryClient,
	QueryClientProvider,
} from '@tanstack/react-query'
import { VideoResourceSchema } from './schemas/video-resource'
import { Video } from '../components/video'
import AdvancedTagSelector from '../components/tag-selector'
import { EggheadTag, EggheadTagSchema } from '../lib/tags'

const elm = document.querySelector('#app')

type BasePost = {
	id: string
	fields: { title: string; slug: string }
	tags: any[]
	resources: {
		resource: {
			id: string
			type: string
			fields: { muxPlaybackId: string; slug: string }
		}
	}[]
}

if (elm) {
	const queryClient = new QueryClient()
	const App = () => {
		return (
			<QueryClientProvider client={queryClient}>
				<AppActual />
			</QueryClientProvider>
		)
	}

	function AppActual() {
		const [currentVideoResourceId, setCurrentVideoResourceId] = React.useState<
			string | null
		>(null)
		const [newVideoResourceId, setNewVideoResourceId] = React.useState<
			string | null
		>(null)
		const [vscodePost, setVscodePost] = React.useState<BasePost | null>(null)
		const [token, setToken] = React.useState<string | null>(null)
		const [apiUrl, setApiUrl] = React.useState<string | null>(null)
		const [useFallback, setUseFallback] = React.useState(false)

		const { data: tags = [], status: tagsStatus } = useQuery({
			queryKey: ['tags'],
			queryFn: async () => {
				const response = await fetch(`${apiUrl}/api/tags`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})
				const data = await response.json()

				console.log('tag data', data)

				const parsed = EggheadTagSchema.array().default([]).safeParse(data)
				if (parsed.success) {
					return parsed.data
				}
				console.error('Error parsing tags', parsed.error)
				throw new Error('Error parsing tags')
			},
		})

		console.log('tags', tags)

		const {
			data: syncedPost,
			status: syncedPostStatus,
			refetch: refetchSyncedPost,
		} = useQuery<BasePost | null>({
			queryKey: ['post', vscodePost?.id],
			queryFn: async () => {
				if (!vscodePost?.id) return null
				const response = await fetch(
					`${apiUrl}/api/posts?slug=${vscodePost?.id}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				)
				const data = await response.json()
				return data
			},
		})

		const {
			data: videoResource,
			status: videoResourceStatus,
			refetch,
		} = useQuery({
			queryKey: [
				'videoResource',
				currentVideoResourceId,
				token,
				syncedPost?.id,
			],
			queryFn: async () => {
				console.log('queryFn', currentVideoResourceId, token, syncedPost?.id)
				if (currentVideoResourceId) {
					const response = await fetch(
						`${apiUrl}/api/videos/${currentVideoResourceId}`,
						{
							headers: {
								Authorization: `Bearer ${token}`,
							},
						},
					)
					const data = await response.json()

					console.log('data', data)

					if (data.error) {
						throw new Error(data.error)
					}

					const parsed = VideoResourceSchema.nullish().safeParse(data)
					if (parsed.success) {
						return parsed.data
					}
					console.error('Error parsing video resource', parsed.error)
					throw new Error('Error parsing video resource')
				}

				return null
			},
			refetchInterval: 15000,
			retry: true,
			retryDelay: 1000,
		})

		console.log('videoResource', videoResource)
		console.log('videoResourceStatus', videoResourceStatus)

		React.useEffect(() => {
			console.log('App component mounted')
			// Log any global errors
			window.onerror = (message, source, lineno, colno, error) => {
				console.error('Global error:', {
					message,
					source,
					lineno,
					colno,
					error,
				})
			}
		}, [])

		React.useEffect(() => {
			window.addEventListener('message', (event) => {
				const message = event.data
				switch (message.command) {
					case 'post':
						console.log('Received post data:', message.post)
						setVscodePost(message.post)
						break
					case 'token':
						setToken(message.token)
						break
					case 'apiUrl':
						setApiUrl(message.apiUrl)
						break
				}
			})
		}, [])

		console.log('Rendering App component')
		console.log('Current post:', syncedPost)
		console.log('Current token:', token)
		console.log('Current apiUrl:', apiUrl)

		const muxPlaybackId =
			syncedPost?.resources?.[0]?.resource?.fields?.muxPlaybackId
		console.log('muxPlaybackId', muxPlaybackId)

		React.useEffect(() => {
			const incomingVideoResource = syncedPost?.resources?.find(
				(resource) => resource.resource.type === 'videoResource',
			)?.resource
			setNewVideoResourceId(null)
			if (incomingVideoResource) {
				setCurrentVideoResourceId(incomingVideoResource.id)
			} else {
				setCurrentVideoResourceId(null)
			}
		}, [syncedPost?.id])

		const { mutateAsync: updatePostTags } = useMutation({
			mutationFn: async (tags: EggheadTag[]) => {
				return await fetch(`${apiUrl}/api/tags/${syncedPost?.id}`, {
					method: 'POST',
					body: JSON.stringify(tags),
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})
			},
		})

		const ws = usePartySocket({
			// usePartySocket takes the same arguments as PartySocket.
			host: 'https://egghead-course-builder.skillrecordings.partykit.dev', // or localhost:1999 in dev
			room: newVideoResourceId || currentVideoResourceId || 'default',
			// in addition, you can provide socket lifecycle event handlers
			// (equivalent to using ws.addEventListener in an effect hook)
			onOpen() {
				console.log('connected')
			},
			onMessage: async (messageEvent) => {
				console.log('messageEvent', messageEvent)
				try {
					const data = JSON.parse(messageEvent.data)

					switch (data.name) {
						case 'video.asset.ready':
						case 'videoResource.created':
							if (data.body.id) {
								setCurrentVideoResourceId(data.body.id)
							}

							break
						case 'transcript.ready':
							// setTranscript(data.body)
							break
						default:
							break
					}
				} catch (error) {
					// nothing to do
				}
			},
		})

		const handleMuxPlayerError = (error: any) => {
			console.error('MuxPlayer error:', error)
			setUseFallback(true)
		}

		React.useEffect(() => {
			const logVideoElement = () => {
				const videoElement = document.querySelector('video')
				if (videoElement) {
					console.log('Video element:', videoElement)
					console.log('Video element src:', videoElement.src)
					console.log('Video element currentSrc:', videoElement.currentSrc)
				} else {
					console.log('No video element found')
				}
			}

			// Log after a short delay to ensure the MuxPlayer has had time to render
			setTimeout(logVideoElement, 2000)
		}, [muxPlaybackId])

		React.useEffect(() => {
			const mediaTheme = document.querySelector('media-theme')
			if (mediaTheme && mediaTheme.shadowRoot) {
				const style = document.createElement('style')
				style.textContent = ':host { visibility: visible !important; }'
				mediaTheme.shadowRoot.appendChild(style)
			}
		}, [])

		return (
			<div className="p-3 font-bold">
				{syncedPostStatus === 'pending' ? (
					<div className="space-y-4">
						<div className="h-[48px] w-3/4 animate-pulse rounded-md bg-[var(--vscode-input-background)] opacity-50" />
						<div className="h-[300px] animate-pulse rounded-md bg-[var(--vscode-input-background)] opacity-50" />
					</div>
				) : (
					<>
						<h1 className="text-4xl font-bold">
							{syncedPost?.fields.title || 'Select a Post'}
						</h1>
						{syncedPost && (
							<a href={`${apiUrl}/${syncedPost.fields.slug}`} target="_blank">
								open in browser
							</a>
						)}
						<div className="py-6">
							<Video
								videoResource={videoResource}
								status={
									videoResourceStatus === 'pending'
										? 'pending'
										: videoResourceStatus
								}
								newVideoResourceId={newVideoResourceId}
								refetch={refetch}
								postId={syncedPost?.id}
								token={token}
								apiUrl={apiUrl}
								onUploaded={(videoId) => {
									setNewVideoResourceId(videoId)
									setCurrentVideoResourceId(videoId)
								}}
							/>
						</div>
						<div className="flex gap-3">
							{syncedPost && (
								<>
									{tagsStatus === 'pending' || tags.length === 0 ? (
										<div className="h-[38px] w-full animate-pulse rounded-md border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] opacity-50" />
									) : (
										<AdvancedTagSelector
											key={syncedPost.id}
											availableTags={tags}
											selectedTags={
												syncedPost?.tags.map((tag) => tag.tag) || []
											}
											onChange={async (tags) => {
												console.log('tags', tags)
												const result = await updatePostTags(tags)
												console.log('result', result)
												refetchSyncedPost()
											}}
										/>
									)}
								</>
							)}
						</div>
					</>
				)}
			</div>
		)
	}

	const root = createRoot(elm)
	root.render(<App />)
}
