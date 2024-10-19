/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/dashboardWebView/**/*.{ts,tsx,js,jsx}'],
	darkMode: ['class', '.vscode-dark'],
	theme: {
		extend: {
			animation: {
				'reverse-spin': 'reverse-spin 1s linear infinite',
			},
			keyframes: {
				'reverse-spin': {
					from: {
						transform: 'rotate(360deg)',
					},
				},
				'vscode-loader': {
					'0%': { left: '0', width: '30px' },
					'25%': { width: '50px' },
					'50%': { width: '20px' },
					'75%': { width: '50px' },
					'100%': { width: '20px', left: '100%' },
				},
			},
		},
	},
	plugins: [require('@tailwindcss/forms'), require('tailwindcss-animate')],
}
