import * as React from 'react'
import { createRoot } from 'react-dom/client'
import './style/dashboard.css'
import VideoUploadForm from '../video-upload/video-upload-form'
const elm = document.querySelector('#app')

if (elm) {
	const App = () => {
		const [post, setPost] = React.useState<{
			id: string
			fields: { title: string }
		} | null>(null)
		const [token, setToken] = React.useState<string | null>(null)
		React.useEffect(() => {
			window.addEventListener('message', (event) => {
				const message = event.data
				switch (message.command) {
					case 'post':
						// Handle the post data
						setPost(message.post)
						break
					case 'token':
						setToken(message.token)
						break
				}
			})
		}, [])
		return (
			<div className="p-32 font-bold">
				<h1 className="text-4xl font-bold text-red-500">
					{post?.fields.title}
				</h1>
				<VideoUploadForm postId={post?.id} token={token} />
			</div>
		)
	}

	const root = createRoot(elm)
	root.render(<App />)
}
