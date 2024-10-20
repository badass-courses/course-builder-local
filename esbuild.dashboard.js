const postCssPlugin = require('esbuild-style-plugin')
const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const server = require('esbuild-server')

const isProduction = process.env.NODE_ENV === 'production'

const buildOptions = {
	entryPoints: ['src/dashboardWebView/dashboard.tsx'],
	bundle: true,
	outdir: 'dist',
	minify: isProduction,
	sourcemap: isProduction ? 'external' : true,
	target: ['es2020'],
	format: 'esm',
	loader: {
		'.tsx': 'tsx',
		'.ts': 'ts',
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
		{
			name: 'rebuild-notify',
			setup(build) {
				build.onEnd((result) => {
					console.log(`build ended with ${result.errors.length} errors`)
					// HERE: somehow restart the server from here, e.g., by sending a signal that you trap and react to inside the server.
				})
			},
		},
	],
}

const cssBuildOptions = {
	entryPoints: ['src/dashboardWebView/style/dashboard.css'],
	outdir: 'dist/style',
	bundle: true,
	minify: isProduction,
	loader: {
		'.css': 'file',
	},
	sourcemap: isProduction ? 'external' : true,
	define: {
		'process.env.NODE_ENV': JSON.stringify(
			process.env.NODE_ENV || 'development',
		),
	},
	plugins: [
		postCssPlugin({
			postcss: {
				plugins: [require('tailwindcss'), require('autoprefixer')],
			},
		}),
		{
			name: 'rebuild-notify',
			setup(build) {
				build.onEnd((result) => {
					console.log(`build ended with ${result.errors.length} errors`)
					// HERE: somehow restart the server from here, e.g., by sending a signal that you trap and react to inside the server.
				})
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
		const cssResult = await esbuild.build(cssBuildOptions)
		console.log({ result })

		const ctx = await esbuild.context(buildOptions)
		const cssCtx = await esbuild.context(cssBuildOptions)

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
		} else {
			await ctx.watch()
			await cssCtx.watch()
		}

		return result
	} catch (error) {
		console.error('Build failed:', error)
		process.exit(1)
	}
}

const main = async () => {
	await build()
	console.log('Build complete.')
	// Development server
	if (!isProduction) {
		server
			.createServer(
				{
					...buildOptions,
					allowOverwrite: true,
					entryPoints: ['dist/dashboard.js', 'dist/style/dashboard.css'],
				},
				{
					port: 9000,
				},
			)
			.start()
			.then(() => {
				console.log('Server started on port 9000')
			})
	} else {
		process.exit(0)
	}
}

main()
