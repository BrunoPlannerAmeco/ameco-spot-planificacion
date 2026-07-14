# AMECO Spot Planner

Versión: **v1.4.0-login**

## Funciones agregadas

- Pantalla de inicio de sesión.
- Acceso con correo y contraseña.
- Sesión persistente mediante Firebase Authentication.
- Botón para cerrar sesión.
- Aplicación protegida: el sistema solo se carga con una sesión válida.

## Configuración necesaria

En Firebase Console:

1. Seguridad → Authentication.
2. Método de acceso.
3. Habilitar **Correo electrónico/contraseña**.
4. Crear los usuarios autorizados en la pestaña **Usuarios**.

## Importante

El acceso anónimo puede deshabilitarse después de crear y probar el primer
usuario con correo y contraseña.
