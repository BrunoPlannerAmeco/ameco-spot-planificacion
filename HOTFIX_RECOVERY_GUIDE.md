# Recuperación v3.9.1

## Causa corregida

El ZIP v3.9.0 contenía las reglas nuevas, pero por un error de empaquetado conservó el `index.html` de la v3.8.0. Por eso:

- No aparecía la etiqueta de rol.
- No aparecía Usuarios, roles y auditoría.
- Firebase podía rechazar el guardado después de publicar las reglas nuevas.

## Publicación correcta

1. Publica primero el `index.html` de esta v3.9.1.
2. Selecciona la rama v3.9.1 en GitHub Pages.
3. Abre la aplicación con Ctrl + F5.
4. Comprueba que aparezcan:
   - La etiqueta `v3.9.1`.
   - La etiqueta `ADMINISTRADOR`, `PLANIFICADOR` o `LECTOR`.
5. Entra a Configuración.
6. Comprueba el panel Usuarios, roles y auditoría.
7. Solo después publica `database.rules.json`.

## Si la página todavía muestra “No se pudo guardar”

Esto indica que las reglas nuevas ya fueron publicadas mientras la página antigua seguía activa.

1. Firebase Console → Realtime Database → Rules.
2. Pega temporalmente `database.rules.recovery.json`.
3. Presiona Publish.
4. Publica y abre la v3.9.1.
5. Inicia sesión con la cuenta principal.
6. Comprueba que aparezca como Administrador.
7. Vuelve a Firebase Rules.
8. Pega `database.rules.json`.
9. Presiona Publish.

Las reglas de recuperación son temporales y no deben quedar publicadas.
