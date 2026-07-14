# AMECO Spot Planner

Versión: **v1.2.0-firebase**

## Incluye

- Aplicación completa original.
- Trabajadores.
- Documentos y exámenes.
- Acreditaciones.
- Certificaciones.
- Turnos 14×14.
- Calendario y edición masiva.
- Firebase Authentication anónima.
- Firebase Realtime Database.
- Sincronización entre usuarios y computadores.
- Configuración para Firebase Hosting.

## Estructura

```text
index.html
css/styles.css
js/app.js
js/firebase-config.js
js/storage-adapter.js
firebase.json
database.rules.json
```

## Cómo funciona

`storage-adapter.js` implementa la API `window.storage` que esperaba el
sistema original, pero guarda los datos en Firebase. De esta forma se conserva
la aplicación completa sin reescribir todos sus módulos de una vez.

## Publicación

Desde la carpeta del proyecto:

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy
```

Selecciona el proyecto:

`ameco-spot-planificacion`

## Seguridad

Esta fase usa autenticación anónima. Toda persona que tenga el enlace podrá
autenticarse y modificar datos. La siguiente fase incorporará usuarios,
contraseñas y permisos.
