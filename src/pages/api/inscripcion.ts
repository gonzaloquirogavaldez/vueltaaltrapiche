import type { APIRoute } from 'astro'
import { getStore } from '@netlify/blobs'
import nodemailer from 'nodemailer'

export const prerender = false

type InscriptionPayload = {
	nombre?: string
	apellido?: string
	dni?: string
	telefono?: string
	email?: string
	fechaNacimiento?: string
	localidad?: string
	equipo?: string
	evento?: string
	categoria?: string
	reglamento?: boolean
}

type InscriptionData = Required<Omit<InscriptionPayload, 'reglamento'>> & {
	reglamento: boolean
	comprobanteUrl: string
}

const requiredFields: Array<keyof InscriptionPayload> = [
	'nombre',
	'apellido',
	'dni',
	'telefono',
	'email',
	'fechaNacimiento',
	'localidad',
	'evento',
	'categoria'
]

const response = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'content-type': 'application/json'
		}
	})

const clean = (value: unknown) => String(value || '').trim()

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')

const allowedFileTypes = new Map([
	['image/png', 'png'],
	['image/jpeg', 'jpg'],
	['image/webp', 'webp']
])

const maxFileSize = 5 * 1024 * 1024

const buildText = (data: InscriptionData) => {
	const nombreCompleto = `${data.nombre} ${data.apellido}`.trim()

	return [
		'Nueva inscripcion Vuelta al Trapiche 2026',
		'',
		`Nombre: ${nombreCompleto}`,
		`DNI: ${data.dni}`,
		`Telefono: ${data.telefono}`,
		`Email: ${data.email}`,
		`Fecha de nacimiento: ${data.fechaNacimiento}`,
		`Localidad: ${data.localidad}`,
		`Equipo: ${data.equipo || '-'}`,
		`Evento: ${data.evento}`,
		`Categoria: ${data.categoria}`,
		`Comprobante: ${data.comprobanteUrl}`,
		'',
		`Acepto reglamento: ${data.reglamento ? 'Si' : 'No'}`
	].join('\n')
}

const buildHtml = (data: InscriptionData) => {
	const rows = [
		['Nombre', escapeHtml(`${data.nombre} ${data.apellido}`.trim())],
		['DNI', escapeHtml(data.dni)],
		['Telefono', escapeHtml(data.telefono)],
		['Email', escapeHtml(data.email)],
		['Fecha de nacimiento', escapeHtml(data.fechaNacimiento)],
		['Localidad', escapeHtml(data.localidad)],
		['Equipo', escapeHtml(data.equipo || '-')],
		['Evento', escapeHtml(data.evento)],
		['Categoria', escapeHtml(data.categoria)],
		['Comprobante', `<a href="${data.comprobanteUrl}">Ver comprobante de pago</a>`],
		['Acepto reglamento', data.reglamento ? 'Si' : 'No']
	]

	return `
		<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
			<h1 style="font-size:24px;margin:0 0 16px">Nueva inscripcion Vuelta al Trapiche 2026</h1>
			<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">
				${rows
					.map(
						([label, value]) => `
							<tr>
								<th align="left" style="border:1px solid #d1d5db;background:#f3f4f6;width:190px">${label}</th>
								<td style="border:1px solid #d1d5db">${value}</td>
							</tr>
						`
					)
					.join('')}
			</table>
		</div>
	`
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const raw = await request.formData()
		const data = {
			nombre: clean(raw.get('nombre')),
			apellido: clean(raw.get('apellido')),
			dni: clean(raw.get('dni')),
			telefono: clean(raw.get('telefono')),
			email: clean(raw.get('email')),
			fechaNacimiento: clean(raw.get('fechaNacimiento')),
			localidad: clean(raw.get('localidad')),
			equipo: clean(raw.get('equipo')),
			evento: clean(raw.get('evento')),
			categoria: clean(raw.get('categoria')),
			reglamento: raw.get('reglamento') === 'on'
		}
		const comprobante = raw.get('comprobante')

		const missing = requiredFields.filter((field) => !data[field])
		if (missing.length > 0 || !data.reglamento) {
			return response(
				{
					ok: false,
					message: 'Faltan datos obligatorios o no se acepto el reglamento.',
					missing
				},
				400
			)
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
			return response({ ok: false, message: 'El email ingresado no es valido.' }, 400)
		}

		if (!(comprobante instanceof File) || comprobante.size === 0) {
			return response({ ok: false, message: 'Adjunta el comprobante de pago.' }, 400)
		}

		const extension = allowedFileTypes.get(comprobante.type)
		if (!extension) {
			return response({ ok: false, message: 'El comprobante debe ser JPG, PNG o WEBP.' }, 400)
		}

		if (comprobante.size > maxFileSize) {
			return response({ ok: false, message: 'El comprobante no puede superar los 5 MB.' }, 400)
		}

		const host = process.env.SMTP_HOST
		const port = Number(process.env.SMTP_PORT || 587)
		const user = process.env.SMTP_USER
		const pass = process.env.SMTP_PASS
		const secure = process.env.SMTP_SECURE === 'true'
		const from = process.env.SMTP_FROM || user
		const to = process.env.MAIL_TO || 'hola@doblebe.com.ar'

		if (!host || !user || !pass || !from) {
			return response(
				{
					ok: false,
					message: 'SMTP no esta configurado. Revisa SMTP_HOST, SMTP_USER, SMTP_PASS y SMTP_FROM.'
				},
				500
			)
		}

		const store = getStore('vuelta-inscripciones')
		const comprobanteKey = `${crypto.randomUUID()}.${extension}`
		await store.set(comprobanteKey, await comprobante.arrayBuffer(), {
			metadata: {
				contentType: comprobante.type,
				fileName: comprobante.name,
				email: data.email
			}
		})

		const siteUrl = process.env.PUBLIC_SITE_URL || new URL(request.url).origin
		const comprobanteUrl = `${siteUrl}/api/comprobantes/${encodeURIComponent(comprobanteKey)}`
		const emailData = {
			...data,
			comprobanteUrl
		}

		const transporter = nodemailer.createTransport({
			host,
			port,
			secure,
			auth: {
				user,
				pass
			}
		})

		const subject = `Inscripcion Vuelta al Trapiche - ${data.nombre} ${data.apellido}`
		const text = buildText(emailData)
		const html = buildHtml(emailData)

		await transporter.sendMail({
			from,
			to,
			cc: data.email,
			replyTo: data.email,
			subject,
			text,
			html
		})

		return response({ ok: true, message: 'Inscripcion enviada correctamente.' })
	} catch (error) {
		console.error('Error enviando inscripcion', error)
		return response({ ok: false, message: 'No se pudo enviar la inscripcion.' }, 500)
	}
}
