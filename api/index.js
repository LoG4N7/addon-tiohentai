const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// Habilitar CORS para permitir solicitudes desde cualquier cliente (Stremio Web, Nuvio, etc.)
app.use(cors());
app.use(express.json());

// Constantes de configuración
const BASE_URL = 'https://tiohentai.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Dominios de publicidad conocidos para filtrar de los iframes
const AD_DOMAINS = [
  'adtng.com',
  'adsterra.com',
  'exoclick.com',
  'syxkn',
  'visariomedia.com',
  'vrdcftcmydygd.com',
  'realsrv.com',
  'doubleclick.net',
  'googlesyndication.com',
  'google.com',
  'cloudflare.com',
  'trafficjunky.com',
  'tsyndicate.com'
];

// Manifiesto del Addon compatible con el estándar Stremio / Nuvio
const MANIFEST = {
  id: 'com.tiohentai.addon',
  name: 'TioHentai Addon',
  version: '1.0.0',
  description: 'Addon de web scraping en tiempo real para reproducir contenido de TioHentai en Nuvio y Stremio.',
  resources: ['stream'],
  types: ['anime'],
  idPrefixes: ['tio-'],
  catalogs: [],
  logo: 'https://tiohentai.com/assets/img/logo-dark.png',
  background: 'https://tiohentai.com/assets/img/bg.jpg',
  behaviorHints: {
    configurable: false,
    configurationRequired: false
  }
};

/**
 * Resuelve y extrae el stream de video directo (.mp4 o .m3u8) o retorna la URL embebida
 * con los headers adecuados según el servidor de video.
 */
async function resolveServer(serverName, embedUrl) {
  const streams = [];

  try {
    const normalizedUrl = embedUrl.startsWith('//') ? `https:${embedUrl}` : embedUrl;
    const lowerUrl = normalizedUrl.toLowerCase();

    // 1. Extractor para YourUpload
    if (lowerUrl.includes('yourupload.com')) {
      try {
        const resp = await axios.get(normalizedUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            Referer: `${BASE_URL}/`
          },
          timeout: 4500
        });

        const html = resp.data;
        // Buscar el archivo de video directo en og:video o jwplayer
        const ogMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+\.mp4[^"']*)["']/i);
        const jwMatch = html.match(/file:\s*['"](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/i);
        const directMp4 = (ogMatch && ogMatch[1]) || (jwMatch && jwMatch[1]);

        if (directMp4) {
          streams.push({
            name: 'TioHentai',
            title: `${serverName || 'YourUpload'} (Directo MP4 - HD)`,
            url: directMp4,
            behaviorHints: {
              proxyHeaders: {
                request: {
                  Referer: 'https://www.yourupload.com/',
                  'User-Agent': USER_AGENT
                }
              },
              notWebReady: false
            }
          });
        }
      } catch (err) {
        // En caso de fallo al extraer directo, el flujo continúa para agregar el reproductor embed
      }
    }

    // 2. Extractor para VOE
    if (lowerUrl.includes('voe.sx') || lowerUrl.includes('derricknationtop.com')) {
      try {
        const resp = await axios.get(normalizedUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            Referer: `${BASE_URL}/`
          },
          maxRedirects: 3,
          timeout: 4500
        });

        const html = resp.data;

        // Buscar enlace directo hls (.m3u8) o mp4 en VOE
        const hlsMatch = html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
        const mp4Match = html.match(/['"](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/i);
        const directVoe = (hlsMatch && hlsMatch[1]) || (mp4Match && mp4Match[1]);

        if (directVoe) {
          streams.push({
            name: 'TioHentai',
            title: `${serverName || 'VOE'} (Directo HLS / MP4)`,
            url: directVoe,
            behaviorHints: {
              proxyHeaders: {
                request: {
                  Referer: normalizedUrl,
                  'User-Agent': USER_AGENT
                }
              }
            }
          });
        }
      } catch (err) {
        // Fallback a embed
      }
    }

    // Siempre agregamos la opción Embebida configurada con los proxyHeaders requeridos
    streams.push({
      name: 'TioHentai',
      title: `${serverName || 'Reproductor'} (Embebido)`,
      url: normalizedUrl,
      behaviorHints: {
        proxyHeaders: {
          request: {
            Referer: `${BASE_URL}/`,
            'User-Agent': USER_AGENT
          }
        }
      }
    });
  } catch (error) {
    // Si ocurre un error, retornamos al menos el enlace básico con Referer
    streams.push({
      name: 'TioHentai',
      title: `${serverName || 'Servidor'} (HD)`,
      url: embedUrl,
      behaviorHints: {
        proxyHeaders: {
          request: {
            Referer: `${BASE_URL}/`
          }
        }
      }
    });
  }

  return streams;
}

/**
 * Función principal de Web Scraping para un episodio de TioHentai
 */
async function scrapeEpisode(episodeSlugOrUrl) {
  let targetUrl = '';

  // Sanitizar y construir la URL del episodio
  if (episodeSlugOrUrl.startsWith('http://') || episodeSlugOrUrl.startsWith('https://')) {
    targetUrl = episodeSlugOrUrl;
  } else {
    // Limpiar posibles prefijos 'tio-', 'ver-' o 'ver/'
    let cleanSlug = episodeSlugOrUrl
      .replace(/^tio-/, '')
      .replace(/^ver-/, '')
      .replace(/^ver\//, '')
      .trim();

    targetUrl = `${BASE_URL}/ver/${cleanSlug}`;
  }

  const response = await axios.get(targetUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      Referer: `${BASE_URL}/`
    },
    timeout: 7000
  });

  const html = response.data;
  const $ = cheerio.load(html);
  const foundServers = [];
  const seenUrls = new Set();

  // Helper para evitar duplicados
  const addServer = (name, url) => {
    if (!url || typeof url !== 'string') return;
    const cleanUrl = url.trim().replace(/\\\//g, '/');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('//')) {
      return;
    }
    // Descartar si coincide con dominios de publicidad
    if (AD_DOMAINS.some((domain) => cleanUrl.toLowerCase().includes(domain))) {
      return;
    }
    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      foundServers.push({ name: name || 'Servidor', url: cleanUrl });
    }
  };

  // 1. Extraer servidores de la variable JavaScript `var videos = [...]`
  const videosVarMatch = html.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
  if (videosVarMatch && videosVarMatch[1]) {
    try {
      const parsedVideos = JSON.parse(videosVarMatch[1]);
      if (Array.isArray(parsedVideos)) {
        for (const item of parsedVideos) {
          if (Array.isArray(item) && item.length >= 2) {
            const serverName = item[0];
            const serverUrl = item[1];
            addServer(serverName, serverUrl);
          }
        }
      }
    } catch (parseError) {
      // Si el JSON falla por caracteres especiales, intentamos con regex
      const regexItems = /\["([^"]+)","([^"]+)"/g;
      let match;
      while ((match = regexItems.exec(videosVarMatch[1])) !== null) {
        addServer(match[1], match[2]);
      }
    }
  }

  // 2. Extraer reproductores desde etiquetas <iframe> presentes en el DOM
  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src) {
      addServer('Iframe Player', src);
    }
  });

  // 3. Extraer opciones desde la tabla de descargas (#downloads) como alternativas de respaldo
  $('#downloads table tbody tr').each((_, row) => {
    const serverName = $(row).find('td').eq(0).text().trim() || 'Download Server';
    const downloadHref = $(row).find('a.btn-download').attr('href');
    if (downloadHref) {
      // Si es un enlace de Mega, convertirlo a embed si aplica
      let embedLink = downloadHref;
      if (embedLink.includes('mega.nz/#!')) {
        embedLink = embedLink.replace('mega.nz/#!', 'mega.nz/embed/!');
      }
      addServer(serverName, embedLink);
    }
  });

  // Procesar y desencapsular los servidores encontrados en paralelo
  const resolutionPromises = foundServers.map((srv) => resolveServer(srv.name, srv.url));
  const resolvedResults = await Promise.allSettled(resolutionPromises);

  const streams = [];
  for (const res of resolvedResults) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      streams.push(...res.value);
    }
  }

  return streams;
}

// ==========================================
// RUTAS Y ENDPOINTS DEL ADDON
// ==========================================

// Página de inicio interactiva para probar el Addon en el navegador
app.get('/', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const manifestUrl = `${protocol}://${host}/manifest.json`;
  const stremioInstallUrl = manifestUrl.replace(/^https?:\/\//, 'stremio://');

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TioHentai Addon para Nuvio & Stremio</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
      <style>
        body { background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
        .hero { max-width: 640px; margin: 60px auto; padding: 32px; background: #1e293b; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .badge-status { background: #10b981; color: #fff; font-size: 0.85rem; padding: 4px 10px; border-radius: 9999px; }
        .code-box { background: #090d16; padding: 12px; border-radius: 8px; font-family: monospace; word-break: break-all; color: #38bdf8; }
        .btn-install { background: #6366f1; color: white; border: none; padding: 12px 24px; font-weight: 600; border-radius: 8px; text-decoration: none; display: inline-block; }
        .btn-install:hover { background: #4f46e5; color: white; }
      </style>
    </head>
    <body>
      <div class="hero text-center">
        <h1 class="h3 mb-2 font-weight-bold">TioHentai Addon</h1>
        <p class="text-secondary mb-3">Addon Serverless para Nuvio y Stremio con Web Scraping en Tiempo Real</p>
        <span class="badge-status mb-4 d-inline-block">● Estado: Activo en Vercel</span>

        <div class="my-4">
          <a href="${stremioInstallUrl}" class="btn-install w-100 mb-2">Instalar en Stremio</a>
          <a href="${manifestUrl}" target="_blank" class="btn btn-outline-light w-100">Ver manifest.json</a>
        </div>

        <div class="text-start mt-4">
          <label class="form-label text-secondary small">URL del Manifiesto para Nuvio:</label>
          <div class="code-box">${manifestUrl}</div>
        </div>

        <div class="text-start mt-4">
          <label class="form-label text-secondary small">Ejemplo de consulta de Streams:</label>
          <div class="code-box">
            <a href="/stream/anime/tio-kanojo-no-tomodachi-3.json" target="_blank" style="color: #38bdf8; text-decoration: underline;">
              /stream/anime/tio-kanojo-no-tomodachi-3.json
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Endpoint GET /manifest.json requerido por el estándar de Stremio / Nuvio
app.get('/manifest.json', (req, res) => {
  res.setHeader('Cache-Control', 'max-age=86400, public');
  res.json(MANIFEST);
});

// Endpoint GET /stream/anime/:id.json (y fallback sin extensión .json)
const streamHandler = async (req, res) => {
  const rawId = req.params.id;

  try {
    const episodeId = rawId ? rawId.replace(/\.json$/, '') : '';

    if (!episodeId) {
      return res.json({ streams: [] });
    }

    // Ejecutar el web scraping en tiempo real
    const streams = await scrapeEpisode(episodeId);

    // Configurar encabezados de caché ligera para evitar peticiones repetidas innecesarias (5 min)
    res.setHeader('Cache-Control', 'max-age=300, public');
    return res.json({ streams: streams || [] });
  } catch (error) {
    console.error(`[Scraper Error] Error extrayendo streams para ID "${rawId}":`, error.message);
    // Garantizar que siempre se responda { "streams": [] } ante cualquier error sin tumbar el servidor
    return res.json({ streams: [] });
  }
};

app.get('/stream/anime/:id.json', streamHandler);
app.get('/stream/anime/:id', streamHandler);

// Iniciar servidor local si no estamos en entorno Vercel Serverless
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 TioHentai Addon iniciado correctamente`);
    console.log(`📡 Local: http://localhost:${PORT}`);
    console.log(`📄 Manifiesto: http://localhost:${PORT}/manifest.json`);
    console.log(`=======================================================`);
  });
}

// Exportar la instancia de Express para que Vercel la ejecute como función Serverless
module.exports = app;
