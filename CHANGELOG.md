# CHANGELOG

## v1.2.0-firebase

### Agregado

- Firebase Authentication anónima.
- Firebase Realtime Database.
- Adaptador compatible con `window.storage`.
- Sincronización remota de los datos principales.
- Archivos de Firebase Hosting.
- Reglas de base de datos.

### Conservado

- Dashboard completo.
- Trabajadores.
- Documentos y exámenes.
- Acreditaciones.
- Certificaciones de equipos.
- Turnos 14×14.
- Edición diaria, arrastre, edición masiva y deshacer.
- Diseño original de AMECO Spot Planner.

### Advertencias

- Los documentos continúan almacenándose codificados en la base de datos.
- Firebase Realtime Database no es ideal para archivos grandes.
- La migración futura moverá documentos a Cloud Storage.
- El acceso anónimo es temporal y se reemplazará por usuarios con permisos.
