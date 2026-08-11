import express from 'express'
import nodemailer from 'nodemailer'

const app = express()
const port = Number(process.env.PORT || 3000)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://cdjeventos.com.ar,https://www.cdjeventos.com.ar')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean)
const attempts = new Map()

app.set('trust proxy', 1)
app.use(express.json({ limit: '32kb' }))
app.use((request, response, next) => {
	const origin = request.headers.origin
	if (origin && allowedOrigins.includes(origin)) {
		response.setHeader('Access-Control-Allow-Origin', origin)
		response.setHeader('Vary', 'Origin')
		response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
		response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
	}
	if (request.method === 'OPTIONS') {
		return origin && allowedOrigins.includes(origin) ? response.sendStatus(204) : response.sendStatus(403)
	}
	next()
})

const clean = (value) => String(value || '').trim()
const escapeHtml = (value) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')

app.get('/health', (_request, response) => response.json({ ok: true }))

app.post('/inscripcion', async (request, response) => {
	const now = Date.now()
	const key = request.ip || 'unknown'
	const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < 15 * 60 * 1000)
	if (recent.length >= 5) {
		return response.status(429).json({ ok: false, message: 'Demasiados intentos. Intenta nuevamente en unos minutos.' })
	}
	recent.push(now)
	attempts.set(key, recent)

	const data = {
		nombre: clean(request.body?.nombre),
		apellido: clean(request.body?.apellido),
		dni: clean(request.body?.dni),
		telefono: clean(request.body?.telefono),
		email: clean(request.body?.email),
		fechaNacimiento: clean(request.body?.fechaNacimiento),
		localidad: clean(request.body?.localidad),
		equipo: clean(request.body?.equipo),
		evento: clean(request.body?.evento),
		categoria: clean(request.body?.categoria),
		jersey: clean(request.body?.jersey),
		formaPago: clean(request.body?.formaPago),
		reglamento: request.body?.reglamento === 'on' || request.body?.reglamento === true
	}
	const required = ['nombre', 'apellido', 'dni', 'telefono', 'email', 'fechaNacimiento', 'localidad', 'evento', 'categoria', 'formaPago']
	if (!data.evento.toLowerCase().includes('kids')) {
		required.push('jersey')
	}
	const missing = required.filter((field) => !data[field])
	if (missing.length || !data.reglamento) {
		return response.status(400).json({ ok: false, message: 'Faltan datos obligatorios o no se aceptó el reglamento.', missing })
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
		return response.status(400).json({ ok: false, message: 'El email ingresado no es válido.' })
	}

	const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, MAIL_TO } = process.env
	if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !(SMTP_FROM || SMTP_USER) || !MAIL_TO) {
		return response.status(500).json({ ok: false, message: 'El envío de correo no está configurado correctamente.' })
	}

	const rows = [
		['Nombre', `${data.nombre} ${data.apellido}`], ['DNI', data.dni], ['Teléfono', data.telefono],
		['Email', data.email], ['Fecha de nacimiento', data.fechaNacimiento], ['Localidad', data.localidad],
		['Equipo', data.equipo || '-'], ['Evento', data.evento], ['Categoría', data.categoria], ['Jersey', data.jersey || 'No aplica'], ['Forma de pago elegida', data.formaPago], ['Aceptó reglamento', 'Sí']
	]
	const text = ['Nueva inscripción Vuelta al Trapiche 2026', '', ...rows.map(([label, value]) => `${label}: ${value}`)].join('\n')
	const html = `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5"><h1>Nueva inscripción Vuelta al Trapiche 2026</h1><table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">${rows.map(([label, value]) => `<tr><th align="left" style="border:1px solid #d1d5db;background:#f3f4f6">${escapeHtml(label)}</th><td style="border:1px solid #d1d5db">${escapeHtml(value)}</td></tr>`).join('')}</table></div>`

	try {
		const transporter = nodemailer.createTransport({
			host: SMTP_HOST,
			port: Number(process.env.SMTP_PORT || 587),
			secure: process.env.SMTP_SECURE === 'true',
			auth: { user: SMTP_USER, pass: SMTP_PASS }
		})
		await transporter.sendMail({
			from: SMTP_FROM || SMTP_USER,
			to: MAIL_TO,
			cc: data.email,
			replyTo: data.email,
			subject: `Inscripción Vuelta al Trapiche - ${data.nombre} ${data.apellido}`,
			text,
			html
		})
		return response.json({ ok: true, message: 'Inscripción enviada correctamente.' })
	} catch (error) {
		console.error('Error enviando inscripción', error)
		return response.status(500).json({ ok: false, message: 'No se pudo enviar la inscripción.' })
	}
})

app.use((_request, response) => response.status(404).json({ ok: false, message: 'Ruta no encontrada.' }))

app.listen(port, '0.0.0.0', () => {
	console.log(`API de inscripciones escuchando en el puerto ${port}`)
})
