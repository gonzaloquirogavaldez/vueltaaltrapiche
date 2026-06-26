import type { APIRoute } from 'astro'
import { getStore } from '@netlify/blobs'

export const prerender = false

const contentTypes: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	webp: 'image/webp'
}

export const GET: APIRoute = async ({ params }) => {
	const key = params.key || ''
	if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(key)) {
		return new Response('Comprobante no valido.', { status: 400 })
	}

	const extension = key.split('.').pop() || ''
	const store = getStore('vuelta-inscripciones')
	const file = await store.get(key, { type: 'arrayBuffer' })

	if (!file) {
		return new Response('Comprobante no encontrado.', { status: 404 })
	}

	return new Response(file, {
		headers: {
			'content-type': contentTypes[extension] || 'application/octet-stream',
			'cache-control': 'private, max-age=3600',
			'content-disposition': `inline; filename="${key}"`
		}
	})
}
