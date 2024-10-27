/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{js,jsx,ts,tsx}'],
	darkMode: ['class', '.vscode-dark'],
	theme: {
		extend: {
			colors: {
				// Core VSCode colors
				background: 'var(--vscode-editor-background)',
				foreground: 'var(--vscode-editor-foreground)',

				// UI Elements
				'ui-border': 'var(--vscode-editorWidget-border)',
				'ui-shadow': 'var(--vscode-widget-shadow)',

				// Interactive elements
				primary: {
					DEFAULT: 'var(--vscode-button-background)',
					foreground: 'var(--vscode-button-foreground)',
					hover: 'var(--vscode-button-hoverBackground)',
					border: 'var(--vscode-button-border)',
				},
				secondary: {
					DEFAULT: 'var(--vscode-button-secondaryBackground)',
					foreground: 'var(--vscode-button-secondaryForeground)',
					hover: 'var(--vscode-button-secondaryHoverBackground)',
				},

				// Form elements
				input: {
					DEFAULT: 'var(--vscode-input-background)',
					foreground: 'var(--vscode-input-foreground)',
					border: 'var(--vscode-input-border)',
					placeholder: 'var(--vscode-input-placeholderForeground)',
				},

				// Status/feedback colors
				error: {
					DEFAULT: 'var(--vscode-errorForeground)',
					background: 'var(--vscode-inputValidation-errorBackground)',
					border: 'var(--vscode-inputValidation-errorBorder)',
				},
				warning: {
					DEFAULT: 'var(--vscode-editorWarning-foreground)',
					background: 'var(--vscode-inputValidation-warningBackground)',
					border: 'var(--vscode-inputValidation-warningBorder)',
				},
				info: {
					DEFAULT: 'var(--vscode-editorInfo-foreground)',
					background: 'var(--vscode-inputValidation-infoBackground)',
					border: 'var(--vscode-inputValidation-infoBorder)',
				},

				// Link colors
				link: {
					DEFAULT: 'var(--vscode-textLink-foreground)',
					active: 'var(--vscode-textLink-activeForeground)',
				},

				// Progress indicators
				progress: {
					background: 'var(--vscode-progressBar-background)',
					foreground: 'var(--vscode-progressBar-foreground)',
				},

				// New colors
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
				},
			},

			// Typography
			fontFamily: {
				sans: ['var(--vscode-font-family)'],
				mono: ['var(--vscode-editor-font-family)'],
			},
			fontSize: {
				base: 'var(--vscode-font-size)',
				code: 'var(--vscode-editor-font-size)',
			},

			// Animations
			animation: {
				'reverse-spin': 'reverse-spin 1s linear infinite',
				progress: 'progress 2s ease infinite',
			},
			keyframes: {
				'reverse-spin': {
					from: {
						transform: 'rotate(360deg)',
					},
				},
				progress: {
					'0%': { left: '0', width: '0%' },
					'50%': { width: '50%' },
					'100%': { left: '100%', width: '0%' },
				},
			},

			// Border radius
			borderRadius: {
				DEFAULT: 'var(--radius)',
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
		require('tailwind-scrollbar'),
		require('tailwindcss-radix'),
		require('tailwindcss-animate'),
	],
}
