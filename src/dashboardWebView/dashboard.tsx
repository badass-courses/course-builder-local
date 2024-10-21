import * as React from 'react'
import { createRoot } from 'react-dom/client'

import VideoUploadForm from '../video-upload/video-upload-form'
import MuxPlayer from '@mux/mux-player-react/lazy'
const elm = document.querySelector('#app')

if (elm) {
	const App = () => {
		const [post, setPost] = React.useState<{
			id: string
			fields: { title: string; slug: string }
			resources: {
				resource: {
					fields: { muxPlaybackId: string; slug: string }
				}
			}[]
		} | null>(null)
		const [token, setToken] = React.useState<string | null>(null)
		const [apiUrl, setApiUrl] = React.useState<string | null>(null)
		const [useFallback, setUseFallback] = React.useState(false)

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
				{muxPlaybackId ? (
					<div className="py-6">
						<MuxPlayer
							preferPlayback="mse"
							src={`https://stream.mux.com/${muxPlaybackId}/high.mp4`}
						/>
						x
						<a href={`${apiUrl}/${post.fields.slug}`} target="_blank">
							open in browser
						</a>
					</div>
				) : (
					<div className="py-3">No video available</div>
				)}
				<VideoUploadForm
					postId={post?.id}
					token={token}
					apiUrl={apiUrl}
					isReplacement={muxPlaybackId ? true : false}
				/>
			</div>
		)
	}

	const root = createRoot(elm)
	root.render(<App />)
}
