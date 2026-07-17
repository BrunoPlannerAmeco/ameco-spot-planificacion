# Configurar la cuenta de servicio de Firebase para backups automatizados

Este documento explica cómo preparar las credenciales que usan
`scripts/backup-rtdb.mjs` y `scripts/restore-rtdb.mjs` (Admin SDK) para leer y
escribir la Realtime Database del proyecto `ameco-spot-planificacion` sin
pasar por las reglas de cliente.

## 1. Crear la cuenta de servicio con mínimo privilegio

No uses la cuenta de servicio "default" del proyecto (tiene rol Editor sobre
todo el proyecto). Crea una cuenta dedicada y acótala solo a RTDB:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
   y selecciona el proyecto `ameco-spot-planificacion`.
2. **Crear cuenta de servicio**:
   - Nombre sugerido: `ameco-backup-automation`.
   - Descripción: "Backups y restauración automatizados de RTDB (CHK-07). No usar para otra cosa."
3. Asigna **un solo rol**: `Firebase Realtime Database Admin`
   (`roles/firebasedatabase.admin`). Este rol permite leer/escribir la RTDB
   completa vía Admin SDK, pero no da acceso a Auth, Storage, Hosting ni a
   otros servicios del proyecto.
4. No asignes `Editor`, `Owner` ni `Firebase Admin` (ese último es más amplio
   que lo necesario).

## 2. Generar la clave JSON

1. Dentro de la cuenta de servicio recién creada: **Claves** → **Agregar clave**
   → **Crear clave nueva** → tipo **JSON**.
2. Se descarga un archivo `xxxx-yyyyyyyyyyyy.json`. Este archivo es un secreto
   equivalente a una contraseña de administrador de la base de datos.

**Nunca** subas ese archivo al repositorio. `.gitignore` ya bloquea patrones
como `*serviceAccount*.json` y `firebase-adminsdk-*.json`, pero la
responsabilidad principal es no copiarlo dentro del árbol del proyecto salvo
en una ruta ya ignorada.

## 3. Configurar el secreto en GitHub Actions (uso en CI)

Los workflows (`.github/workflows/backup-rtdb.yml`) leen la credencial desde
un secreto en base64, nunca desde un archivo en el repo.

1. Codifica el JSON descargado:
   - macOS/Linux: `base64 -i service-account.json | tr -d '\n'`
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))`
2. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
3. Crea estos secretos:

   | Secreto | Valor |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT_BASE64` | El resultado del paso 1 |
   | `FIREBASE_DATABASE_URL` | `https://ameco-spot-planificacion-default-rtdb.firebaseio.com` |

4. Borra el archivo JSON local una vez configurado el secreto (o guárdalo en un
   gestor de contraseñas, nunca en el disco del equipo sin cifrar).

## 4. Uso local / manual (fuera de CI)

Para ejecutar los scripts a mano (por ejemplo, para una restauración de
emergencia):

```bash
# Windows PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\segura\fuera-del-repo\service-account.json"
$env:FIREBASE_DATABASE_URL = "https://ameco-spot-planificacion-default-rtdb.firebaseio.com"
node scripts/backup-rtdb.mjs --reason=manual
```

Guarda el archivo de la cuenta de servicio **fuera del directorio del
repositorio** (por ejemplo, en una carpeta personal protegida), para que un
`git add .` accidental nunca pueda incluirlo.

## 5. Rotación y revocación

- Rota la clave cada **90 días** (crea una clave nueva, actualiza el secreto
  de GitHub, luego borra la clave antigua en la consola de GCP).
- Si sospechas que la clave se filtró (se compartió por error, quedó en un
  historial de commits, etc.), revócala inmediatamente desde IAM y genera una
  nueva. La revocación no requiere coordinar con Firebase Auth ni afecta a los
  usuarios de la app.
- Lleva un registro de cuándo se rotó por última vez (puede ser una línea en
  `CHANGELOG.md` o en el propio historial de la rama `data-backups`).

## 6. Qué NO requiere esta cuenta de servicio (uso diario)

- No necesita rol de administración de usuarios de Auth.
- No necesita acceso de Hosting/GitHub Pages.
- No necesita acceso a Storage para el uso diario (backup/restore de RTDB).

## 7. Permiso adicional para migrar documentos a Storage (CHK-02, uso puntual)

`scripts/migrate-worker-documents-to-storage.mjs --confirm` sube archivos a
Firebase Storage, algo que el rol `Firebase Realtime Database Admin` no
cubre. Como es una migración de **una sola vez** (no un proceso recurrente
como el backup diario), la recomendación es no ampliar el rol permanente de
`ameco-backup-automation`, sino agregar el permiso solo mientras se corre la
migración y quitarlo después:

1. En IAM (Google Cloud Console), edita los roles de `ameco-backup-automation`
   y agrega temporalmente `Storage Object Admin` (`roles/storage.objectAdmin`).
2. Corre la migración (primero en dry-run, sin este permiso ya alcanza para
   ver qué se migraría; recién con `--confirm` hace falta el rol).
3. Terminada la migración, **quita el rol `Storage Object Admin`** de la
   cuenta de servicio, dejándola otra vez acotada solo a RTDB.

El modo dry-run (por defecto) nunca necesita este permiso — solo lee RTDB.
