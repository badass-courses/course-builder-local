import * as React from 'react'
import MuxPlayer from '@mux/mux-player-react/lazy'
import { VideoResourceSchema } from '../dashboardWebView/schemas/video-resource'
import { useQuery } from '@tanstack/react-query'
import VideoUploadForm from '../video-upload/video-upload-form'

type VideoProps = {
	videoResource: typeof VideoResourceSchema._type | null | undefined
	status: 'error' | 'success' | 'pending'
	newVideoResourceId: string | null
	refetch: () => void
	postId?: string
	token: string | null
	apiUrl: string | null
	onUploaded: (videoId: string) => void
}

type State = {
	view: 'empty' | 'error' | 'processing' | 'ready' | 'upload' | 'loading'
	message: string
}

type Action =
	| { type: 'SET_EMPTY' }
	| { type: 'SET_ERROR'; message: string }
	| { type: 'SET_PROCESSING'; message: string }
	| { type: 'SET_READY' }
	| { type: 'SET_UPLOAD' }
	| { type: 'SET_LOADING' }

function videoReducer(state: State, action: Action): State {
	switch (action.type) {
		case 'SET_EMPTY':
			return { view: 'upload', message: 'No Video' } // Changed default to upload view
		case 'SET_ERROR':
			return { view: 'error', message: action.message }
		case 'SET_PROCESSING':
			return { view: 'processing', message: action.message }
		case 'SET_READY':
			return { view: 'ready', message: '' }
		case 'SET_UPLOAD':
			return { view: 'upload', message: '' }
		case 'SET_LOADING':
			return { view: 'loading', message: 'Loading...' }
		default:
			return state
	}
}

export function Video({
	videoResource,
	status,
	newVideoResourceId,
	refetch,
	postId,
	token,
	apiUrl,
	onUploaded,
}: VideoProps) {
	const [state, dispatch] = React.useReducer(videoReducer, {
		view: 'loading',
		message: 'Loading...',
	})

	const { data: mp4Ready, isLoading: mp4ReadyLoading } = useQuery({
		queryKey: ['mp4Ready', videoResource],
		queryFn: async () => {
			if (videoResource?.muxPlaybackId) {
				const response = await fetch(
					`https://stream.mux.com/${videoResource.muxPlaybackId}/high.mp4`,
					{ method: 'HEAD' },
				)
				if (response.ok) return true
				throw new Error('No mp4')
			}
			throw new Error('No muxPlaybackId')
		},
		retry: true,
		retryDelay: 5000,
	})

	React.useEffect(() => {
		if (status === 'pending') {
			dispatch({ type: 'SET_LOADING' })
			return
		}

		if (!videoResource) {
			if (status === 'error') {
				dispatch({ type: 'SET_ERROR', message: 'error loading video' })
			} else if (newVideoResourceId) {
				dispatch({ type: 'SET_PROCESSING', message: 'video is processing' })
			} else {
				dispatch({ type: 'SET_UPLOAD' })
			}
			return
		}

		switch (videoResource.state) {
			case 'ready':
				if (mp4Ready) {
					dispatch({ type: 'SET_READY' })
				} else if (mp4ReadyLoading) {
					dispatch({ type: 'SET_LOADING' })
				} else {
					dispatch({ type: 'SET_PROCESSING', message: 'final encoding' })
				}
				break
			case 'new':
				dispatch({ type: 'SET_PROCESSING', message: 'storing video files' })
				break
			case 'processing':
				dispatch({
					type: 'SET_PROCESSING',
					message: 'converting video formats for distribution',
				})
				break
			case 'preparing':
				dispatch({ type: 'SET_PROCESSING', message: 'video is preparing' })
				break
			case 'errored':
				dispatch({
					type: 'SET_ERROR',
					message:
						'video is errored. sorry for the hassle. try again and send me a message.',
				})
				break
		}
	}, [videoResource, status, newVideoResourceId, mp4Ready, mp4ReadyLoading])

	const renderContent = () => {
		switch (state.view) {
			case 'loading':
				return (
					<div className="bg-muted flex h-full w-full animate-pulse items-center justify-center rounded-md">
						<div className="text-muted-foreground">Loading...</div>
					</div>
				)
			case 'ready':
				return (
					<div className="relative h-full w-full">
						<MuxPlayer
							preferPlayback="mse"
							src={`https://stream.mux.com/${videoResource?.muxPlaybackId}/high.mp4`}
							onError={(e) => {
								console.error('MuxPlayer error:', e)
								refetch()
							}}
						/>
						<button
							onClick={() => dispatch({ type: 'SET_UPLOAD' })}
							className="absolute right-2 top-2 rounded-md bg-primary px-2 py-1 text-sm text-primary-foreground"
						>
							Replace
						</button>
					</div>
				)
			case 'upload':
				return (
					<VideoUploadForm
						postId={postId}
						token={token}
						apiUrl={apiUrl}
						isReplacement={videoResource?.muxPlaybackId ? true : false}
						onUploaded={onUploaded}
						onCancel={
							videoResource ? () => dispatch({ type: 'SET_READY' }) : undefined
						}
					/>
				)
			case 'empty':
			case 'error':
			case 'processing':
				return (
					<div className="text-muted-foreground text-center">
						{state.message}
					</div>
				)
		}
	}

	return (
		<div className="bg-muted/80 flex aspect-video h-full w-full items-center justify-center p-5">
			{renderContent()}
		</div>
	)
}
