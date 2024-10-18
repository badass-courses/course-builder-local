import * as React from 'react'
import { createRoot } from 'react-dom/client'

const elm = document.querySelector('#app')

if (elm) {
	const App = () => {
		return <div>Hello World!!!!!!! OH SHIT</div>
	}

	const root = createRoot(elm)
	root.render(<App />)
}
