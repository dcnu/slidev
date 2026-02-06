import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	plugins: [],
	server: {
		https: {
			key: fs.readFileSync(resolve(__dirname, '.certs/key.pem')),
			cert: fs.readFileSync(resolve(__dirname, '.certs/cert.pem')),
		},
	},
})
