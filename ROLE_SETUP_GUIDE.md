# Guía de configuración de roles v3.9.0

## 1. Publicar la aplicación

Publica primero la rama v3.9.0.

## 2. Crear el primer Administrador

Antes de publicar las reglas nuevas:

1. Inicia sesión con la cuenta que será Administrador.
2. La plataforma creará automáticamente:
   - `amecoSpotPlanner/accessMeta`
   - `amecoSpotPlanner/users/<UID>`
3. Verifica que en Configuración aparezca el rol Administrador.

## 3. Publicar las reglas

1. Abre Firebase Console.
2. Realtime Database.
3. Pestaña Rules.
4. Copia el contenido de `database.rules.json`.
5. Presiona Publish.

Subir el archivo a GitHub no publica las reglas.

## 4. Crear otra cuenta

1. Firebase Console → Authentication → Users.
2. Agrega un usuario con correo y contraseña.
3. Abre el usuario y copia el UID.
4. En AMECO Spot Planner:
   - Configuración.
   - Usuarios, roles y auditoría.
   - Agregar acceso.
5. Escribe el UID y el mismo correo.
6. Selecciona Planificador o Lector.

## 5. Desactivar una cuenta

Edita el perfil y selecciona Desactivado. La cuenta podrá seguir existiendo en Firebase Authentication, pero la plataforma cerrará su sesión y las reglas impedirán leer o escribir datos.

## Limitación conocida

La base principal sigue dentro de `legacyStorage` como JSON. Las reglas distinguen:

- Administrador y Planificador: lectura y escritura.
- Lector: solo lectura.
- Desactivado: sin acceso.

Las reglas todavía no pueden reservar eliminaciones específicas exclusivamente al Administrador porque no pueden inspeccionar el contenido interno del JSON. Esta limitación se resolverá al separar los módulos en la siguiente arquitectura.
