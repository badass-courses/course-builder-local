/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{js,jsx,ts,tsx}'],
	darkMode: ['class', '.vscode-dark'],
	theme: {
		extend: {
			colors: {
				'vscode-editor': 'var(--vscode-editor-background)',
				'vscode-foreground': 'var(--vscode-foreground)',
				'vscode-button-background': 'var(--vscode-button-background)',
				'vscode-button-foreground': 'var(--vscode-button-foreground)',
				'vscode-button-border': 'var(--vscode-button-border)',
				'vscode-button-hoverBackground': 'var(--vscode-button-hoverBackground)',
				'vscode-errorForeground': 'var(--vscode-errorForeground)',
				'vscode-progressBar-background': 'var(--vscode-progressBar-background)',
				'vscode-progressBar-foreground': 'var(--vscode-progressBar-foreground)',
				'vscode-textLink-foreground': 'var(--vscode-textLink-foreground)',
			},
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
