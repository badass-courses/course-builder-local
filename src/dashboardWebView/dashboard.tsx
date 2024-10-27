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

const elm = document.querySelector('#app')

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
		const [post, setPost] = React.useState<{
			id: string
			fields: { title: string; slug: string }
			resources: {
				resource: {
					id: string
					type: string
					fields: { muxPlaybackId: string; slug: string }
				}
			}[]
		} | null>(null)
		const [token, setToken] = React.useState<string | null>(null)
		const [apiUrl, setApiUrl] = React.useState<string | null>(null)
		const [useFallback, setUseFallback] = React.useState(false)

		console.log({ token })

		const {
			data: videoResource,
			status,
			refetch,
		} = useQuery({
			queryKey: ['videoResource', currentVideoResourceId, token, post?.id],
			queryFn: async () => {
				console.log('queryFn', currentVideoResourceId, token, post?.id)
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

		const { data: mp4Ready } = useQuery({
			queryKey: ['mp4Ready', videoResource],
			queryFn: async () => {
				if (videoResource?.muxPlaybackId) {
					console.log('fetching mp4')
					const response = await fetch(
						`https://stream.mux.com/${videoResource.muxPlaybackId}/high.mp4`,
						{
							method: 'HEAD',
						},
					)
					console.log('response', response)
					if (response.ok) {
						return true
					}
					throw new Error('No mp4')
				}
				console.log('no muxPlaybackId')
				throw new Error('No muxPlaybackId')
			},
			retry: true,
			retryDelay: 5000,
		})

		console.log('videoResource', videoResource)
		console.log('status', status)

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
						setPost(message.post)
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
		console.log('Current post:', post)
		console.log('Current token:', token)
		console.log('Current apiUrl:', apiUrl)

		const muxPlaybackId = post?.resources?.[0]?.resource?.fields?.muxPlaybackId
		console.log('muxPlaybackId', muxPlaybackId)

		React.useEffect(() => {
			const incomingVideoResource = post?.resources?.find(
				(resource) => resource.resource.type === 'videoResource',
			)?.resource
			setNewVideoResourceId(null)
			if (incomingVideoResource) {
				setCurrentVideoResourceId(incomingVideoResource.id)
			} else {
				setCurrentVideoResourceId(null)
			}
		}, [post?.id])

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
				<h1 className="text-4xl font-bold">
					{post?.fields.title || 'No title'}
				</h1>
				{post && (
					<a href={`${apiUrl}/${post.fields.slug}`} target="_blank">
						open in browser
					</a>
				)}
				<div className="py-6">
					<Video
						videoResource={videoResource}
						status={status}
						newVideoResourceId={newVideoResourceId}
						refetch={refetch}
						postId={post?.id}
						token={token}
						apiUrl={apiUrl}
						onUploaded={(videoId) => {
							setNewVideoResourceId(videoId)
							setCurrentVideoResourceId(videoId)
						}}
					/>
				</div>
			</div>
		)
	}

	const root = createRoot(elm)
	root.render(<App />)
}
