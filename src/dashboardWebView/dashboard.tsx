import * as React from 'react'
import { createRoot } from 'react-dom/client'
import './style/dashboard.css'
const elm = document.querySelector('#app')

if (elm) {
	const App = () => {
		const [post, setPost] = React.useState<{
			id: string
			fields: { title: string }
		} | null>(null)
		React.useEffect(() => {
			window.addEventListener('message', (event) => {
				const message = event.data
				switch (message.command) {
					case 'post':
						// Handle the post data
						setPost(message.post)
						break
				}
			})
		}, [])
		return (
			<div className="p-8 font-bold">
				<h1 className="text-4xl font-bold text-red-500">
					{post?.fields.title}
				</h1>
				<a href="https://www.google.com">Google</a>
			</div>
		)
	}

	const root = createRoot(elm)
	root.render(<App />)
}
