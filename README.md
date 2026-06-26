# Vuelta al Trapiche

Sitio Astro para la landing e inscripcion online de Vuelta al Trapiche.

El proyecto incluye:

- Landing page con video de fondo, galeria, recorridos y reglamento.
- Formulario de inscripcion en pasos.
- Envio de email por SMTP con Nodemailer.
- Subida de comprobante de pago.
- API routes de Astro para procesar inscripciones y servir comprobantes.

## Requisito importante

Este sitio no es solo HTML estatico. El formulario usa backend:

- `POST /api/inscripcion`
- `GET /api/comprobantes/[key]`

Por eso, para que funcionen el envio de correos y la subida de comprobantes, el hosting debe ejecutar Node.js o funciones serverless compatibles con Astro.

## Opcion recomendada

La opcion mas simple para este proyecto es desplegarlo en Netlify, porque ya esta configurado con `@astrojs/netlify` y usa Netlify Blobs para guardar comprobantes.

En Hostinger tambien puede funcionar si el plan permite aplicaciones Node.js persistentes. Si el plan solo permite hosting web estatico o PHP, el frontend puede verse, pero el formulario no funcionara.

## Variables de entorno

Crear estas variables en el panel del hosting:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=usuario@example.com
SMTP_PASS=clave-smtp
SMTP_FROM="Vuelta al Trapiche <usuario@example.com>"
MAIL_TO=hola@doblebe.com.ar
PUBLIC_SITE_URL=https://tudominio.com
```

Notas:

- `MAIL_TO` es el correo interno que recibe la inscripcion.
- El correo del participante se toma desde el formulario y se agrega como copia.
- `PUBLIC_SITE_URL` debe ser la URL real del sitio en produccion, sin barra final.

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Levantar servidor local:

```bash
npm run dev
```

Abrir:

```text
http://localhost:4321
```

Compilar produccion:

```bash
npm run build
```

Previsualizar build:

```bash
npm run preview
```

## Deploy en Hostinger con Node.js

Usar esta opcion solo si el plan de Hostinger tiene soporte para aplicaciones Node.js.

1. Subir el proyecto completo al servidor o conectarlo desde Git.
2. En el panel de Hostinger, crear una aplicacion Node.js.
3. Seleccionar una version moderna de Node.js. Recomendado: Node 22 o superior.
4. Configurar el directorio raiz donde esta `package.json`.
5. Definir las variables de entorno listadas arriba.
6. Instalar dependencias:

```bash
npm install
```

7. Compilar:

```bash
npm run build
```

8. Comando de inicio:

```bash
npm run preview -- --host 0.0.0.0
```

Si Hostinger solicita un puerto, usar el puerto que entregue el panel mediante variable de entorno. En muchos hostings Node el puerto se expone como `PORT`.

Comando alternativo si el panel permite usar `PORT`:

```bash
npm run preview -- --host 0.0.0.0 --port $PORT
```

En Windows local seria:

```powershell
npm run preview -- --host 0.0.0.0 --port $env:PORT
```

## Deploy en Hostinger estatico

Esta opcion solo sirve para publicar la parte visual. No funcionaran:

- Envio del formulario.
- Subida de comprobante.
- Link de comprobante en el email.

Pasos:

1. Ejecutar:

```bash
npm run build
```

2. Subir el contenido de `dist/` a `public_html`.
3. Verificar que `index.html`, assets y rutas estaticas queden dentro de `public_html`.

Para usar hosting estatico y mantener el formulario, se necesita mover el backend a otro servicio Node.js o serverless y cambiar el `fetch('/api/inscripcion')` del formulario por la URL externa de esa API.

## Si se quiere backend separado en Node.js

Arquitectura alternativa:

- Hostinger estatico: sirve el frontend.
- Backend Node.js separado: recibe inscripciones, sube comprobantes y envia emails SMTP.

En ese caso hay que:

1. Crear una API Node.js con Express o Fastify.
2. Usar `multer` para recibir el archivo.
3. Guardar comprobantes en storage persistente: disco del servidor, S3 compatible, Cloudinary, Uploadcare o similar.
4. Enviar el email con Nodemailer.
5. Habilitar CORS para el dominio del frontend.
6. Cambiar el formulario para enviar a la URL del backend:

```ts
fetch('https://api.tudominio.com/inscripcion', {
	method: 'POST',
	body: data
})
```

## Archivos principales

- `src/pages/index.astro`: landing y formulario.
- `src/pages/api/inscripcion.ts`: endpoint que procesa inscripciones.
- `src/pages/api/comprobantes/[key].ts`: endpoint que sirve comprobantes.
- `public/assets/`: imagenes y videos.
- `public/reglamento-vuelta-al-trapiche-2026.txt`: reglamento descargable.
- `.env.example`: ejemplo de variables de entorno.

## Comprobantes de pago

El formulario acepta imagenes:

- JPG
- PNG
- WEBP

Limite actual: 5 MB.

El archivo se guarda con una clave unica y el email incluye un enlace para verlo.

## Recomendacion final

Para este proyecto, usar Netlify o un hosting Node.js real. Si el objetivo es Hostinger, confirmar primero que el plan contratado soporte aplicaciones Node.js. Si no lo soporta, publicar solo en `public_html` va a dejar el formulario sin funcionamiento.
