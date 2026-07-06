# API de inscripciones

Aplicación Node independiente para `https://api.cdjeventos.com.ar`.

## Despliegue en Hostinger

- Sube solamente el contenido de esta carpeta o úsala como raíz de una aplicación Node.js.
- Framework: Other o Express.
- Gestor: npm.
- Comando de compilación: no requiere.
- Archivo de entrada: `server.js`.
- Comando de inicio, si se solicita: `npm start`.
- Node.js: 22.

## Variables de entorno

```text
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=hola@doblebe.com.ar
SMTP_PASS=Angelito19/06
SMTP_SECURE=true
SMTP_FROM=hola@doblebe.com.ar
MAIL_TO=hola@doblebe.com.ar
ALLOWED_ORIGINS=https://cdjeventos.com.ar,https://www.cdjeventos.com.ar
```

Después del despliegue, `https://api.cdjeventos.com.ar/health` debe responder `{"ok":true}`.
