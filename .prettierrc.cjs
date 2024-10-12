/** @typedef  {import("prettier").Config} PrettierConfig */

/** @type { PrettierConfig } } */
const config = {
	arrowParens: 'always',
	printWidth: 80,
	singleQuote: true,
	semi: false,
	trailingComma: 'all',
	useTabs: true,
	tabWidth: 2,
	plugins: [

		'prettier-plugin-tailwindcss',
	],
	proseWrap: 'always', // printWidth line breaks in md/mdx
}

module.exports = config
