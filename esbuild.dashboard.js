const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const server = require('esbuild-server')

const isProduction = process.env.NODE_ENV === 'production'

const buildOptions = {
	entryPoints: ['src/dashboardWebView/index.tsx'],
	bundle: true,
	outfile: 'dist/dashboard.js',
	minify: isProduction,
	sourcemap: isProduction ? 'external' : true,
	target: ['es2020'],
	format: 'esm',
	loader: {
		'.tsx': 'tsx',
		'.ts': 'ts',
		'.js': 'js',
		'.css': 'css',
	},
	metafile: true,
	define: {
		'process.env.NODE_ENV': JSON.stringify(
			process.env.NODE_ENV || 'development',
		),
	},
	plugins: [
		{
			name: 'provide-process',
			setup(build) {
				build.onResolve({ filter: /^process$/ }, (args) => ({
					path: require.resolve('process/browser'),
				}))
			},
		},
	],
}

if (isProduction) {
	buildOptions.entryNames = '[name].[hash]'
	buildOptions.chunkNames = '[name].[hash]'
}

const build = async () => {
	try {
		const result = await esbuild.build(buildOptions)

		// Generate manifest
		const manifest = Object.keys(result.metafile.outputs).reduce((acc, key) => {
			const relativePath = path.relative('dist', key)
			acc[relativePath] = relativePath
			return acc
		}, {})

		fs.writeFileSync(
			path.join(__dirname, 'dist', 'dashboard.manifest.json'),
			JSON.stringify(manifest, null, 2),
		)

		console.log('Build complete. Manifest generated.')

		if (isProduction) {
			// Generate bundle analysis
			const analyzerHtml = `
				<html>
					<body>
						<pre>${JSON.stringify(result.metafile, null, 2)}</pre>
					</body>
				</html>
			`
			fs.writeFileSync(
				path.join(__dirname, 'dist', 'dashboard.html'),
				analyzerHtml,
			)
			console.log('Bundle analysis generated.')
		}

		return result
	} catch (error) {
		console.error('Build failed:', error)
		process.exit(1)
	}
}

const main = async () => {
	await build()

	// Development server
	if (!isProduction) {
		server
			.createServer(
				{
					...buildOptions,
					allowOverwrite: true,
					entryPoints: ['dist/dashboard.js'],
				},
				{
					port: 9000,
				},
			)
			.start()
			.then(() => {
				console.log('Server started on port 9000')
			})
	}
}

main()
