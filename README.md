# TioHentai Addon para Nuvio & Stremio (Serverless en Vercel)

Addon completo y ligero para **Nuvio** y **Stremio** desarrollado en **Node.js**, **Express**, **Cheerio** y **Axios**. Realiza web scraping en tiempo real sobre el sitio [tiohentai.com](https://tiohentai.com) para extraer y desencapsular servidores de video y reproducirlos de forma directa o embebida.

---

## 📁 Estructura del Proyecto

```text
addon-tiohentai/
├── api/
│   └── index.js       # Servidor Express, endpoints y lógica de web scraping
├── .gitignore         # Exclusión de node_modules y archivos temporales
├── package.json       # Dependencias del proyecto
├── vercel.json        # Configuración de rutas serverless para Vercel
└── README.md          # Documentación y guía de despliegue
```

---

## 🚀 1. Cómo Probar el Servidor Localmente

### Paso 1: Instalar dependencias
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
npm install
```
*(En Windows PowerShell si tienes políticas de scripts restringidas, usa `npm.cmd install`)*

### Paso 2: Iniciar el servidor
Tienes dos opciones para probar localmente:

#### Opción A: Directo con Node.js (Más rápido)
```bash
node api/index.js
```
o mediante el script de npm:
```bash
npm start
```

El servidor estará escuchando en `http://localhost:3000`.

#### Opción B: Con Vercel CLI (Simula el entorno Serverless)
Si tienes instalado Vercel CLI globalmente (`npm install -g vercel`):
```bash
vercel dev
```

### Paso 3: Probar los Endpoints en tu navegador o cliente HTTP

1. **Interfaz Web de Bienvenida:**
   - Abre en tu navegador: [http://localhost:3000/](http://localhost:3000/)

2. **Manifiesto del Addon:**
   - [http://localhost:3000/manifest.json](http://localhost:3000/manifest.json)
   - Responde con recursos `["catalog", "stream"]` y el catálogo `tio-latest`.

3. **Catálogo de Últimos Agregados:**
   - [http://localhost:3000/catalog/anime/tio-latest.json](http://localhost:3000/catalog/anime/tio-latest.json)
   - Devuelve la lista de anime/episodios con portada, título y prefijo `tio-`.

4. **Búsqueda en el Catálogo:**
   - [http://localhost:3000/catalog/anime/tio-latest/search=kanojo.json](http://localhost:3000/catalog/anime/tio-latest/search=kanojo.json)
   - Realiza búsqueda en tiempo real en TioHentai.

5. **Prueba de Extracción de Streams (Web Scraping en tiempo real):**
   - [http://localhost:3000/stream/anime/tio-kanojo-no-tomodachi-3.json](http://localhost:3000/stream/anime/tio-kanojo-no-tomodachi-3.json)
   - Verás el arreglo `streams` con los servidores detectados (YourUpload con enlace directo MP4, VOE, MEGA, etc.) y sus correspondientes `proxyHeaders`.

---

## 🐙 2. Comandos Git para Subir el Proyecto a GitHub

Sigue estos pasos en tu terminal para crear el repositorio y subir el código a GitHub:

1. **Crear un nuevo repositorio en GitHub:**
   - Ve a [github.com/new](https://github.com/new)
   - Nómbralo (por ejemplo: `nuvio-tiohentai-addon`)
   - Selecciona **Public** o **Private** (ambos funcionan con Vercel)
   - **No** marques la opción de inicializar con README ni .gitignore (ya los tenemos creados).
   - Haz clic en **Create repository**.

2. **Inicializar y subir el código desde tu terminal:**
   ```bash
   # 1. Inicializar el repositorio Git local
   git init

   # 2. Agregar todos los archivos al seguimiento
   git add .

   # 3. Crear el primer commit
   git commit -m "feat: Addon inicial de TioHentai para Nuvio y Vercel"

   # 4. Asegurarse de que la rama principal sea main
   git branch -M main

   # 5. Vincular con tu repositorio remoto de GitHub (reemplaza TU_USUARIO y TU_REPOSITORIO)
   git remote add origin https://github.com/TU_USUARIO/nuvio-tiohentai-addon.git

   # 6. Subir los archivos a GitHub
   git push -u origin main
   ```

---

## ⚡ 3. Despliegue Serverless en Vercel

Una vez que el proyecto esté en GitHub, el despliegue en Vercel toma menos de 1 minuto:

1. **Iniciar sesión en Vercel:**
   - Ingresa a [vercel.com](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.

2. **Importar el Repositorio:**
   - Haz clic en el botón **"Add New..."** -> **"Project"**.
   - En la lista de repositorios de GitHub, busca `nuvio-tiohentai-addon` y presiona **"Import"**.

3. **Configuración del Proyecto:**
   - **Framework Preset:** Déjalo en `Other` (Vercel detectará automáticamente la configuración de `vercel.json` y la carpeta `api/`).
   - **Root Directory:** `./`
   - No necesitas configurar variables de entorno obligatorias a menos que desees personalizar puertos o secretos.

4. **Desplegar:**
   - Haz clic en **"Deploy"**.
   - En pocos segundos, Vercel compilará la función serverless y te otorgará un dominio público del tipo:
     ```text
     https://tu-proyecto.vercel.app
     ```

5. **Obtener la URL del Manifiesto:**
   Tu URL definitiva para Nuvio y Stremio será:
   ```text
   https://tu-proyecto.vercel.app/manifest.json
   ```

---

## 📱 4. Cómo Instalar el Addon en Nuvio y Stremio

### En Nuvio:
1. Abre la aplicación **Nuvio** en tu dispositivo.
2. Dirígete a la sección de **Addons** / **Complementos**.
3. Selecciona la opción de **Agregar Addon mediante URL**.
4. Pega tu URL de Vercel:
   ```text
   https://tu-proyecto.vercel.app/manifest.json
   ```
5. Presiona **Instalar** o **Agregar**.

### En Stremio:
1. Abre tu navegador e ingresa a: `https://tu-proyecto.vercel.app/`
2. Haz clic en el botón **"Instalar en Stremio"** (se abrirá automáticamente el protocolo `stremio://`).
3. O en Stremio, ve a Addons -> Pega `https://tu-proyecto.vercel.app/manifest.json` en la barra de búsqueda y confirma.

---

## 🛠️ Especificaciones Técnicas

- **Formato del Identificador de Episodio (`:id`):**
  - Admite el slug con prefijo: `tio-kanojo-no-tomodachi-3`
  - Admite el slug sin prefijo: `kanojo-no-tomodachi-3`
  - Admite con o sin extensión `.json`: `tio-nombre-episodio.json`
- **Tolerancia a fallos:**
  - Todas las operaciones de scraping están protegidas con bloques `try/catch`.
  - Si un episodio no existe o una fuente falla, el servidor siempre responderá `{ "streams": [] }`, evitando caídas del contenedor serverless de Vercel.
- **Headers Proxy:**
  - Cada stream emitido incluye `behaviorHints.proxyHeaders` con `Referer: https://tiohentai.com/` (o del host correspondiente) para eludir protecciones por enlace directo indebido (hotlinking).
