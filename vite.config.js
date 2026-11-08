import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { META } from './src/seo/meta.js'


const escapeHtml = (v) =>
  v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** Writes dist/<route>/index.html with route-specific head tags and crawlable body text. */
function prerenderRoutes(distDir, siteUrl) {
  const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8')
  const nav = Object.values(META)
    .map((m) => `<a href="${m.path}">${escapeHtml(m.breadcrumb)}</a>`)
    .join(' ')

  for (const [key, m] of Object.entries(META)) {
    const url = siteUrl + m.path
    const title = escapeHtml(m.title)
    const desc = escapeHtml(m.description)
    const h1 = escapeHtml(m.title.split(' — ')[0])
    let html = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${desc}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
      .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${title}$2`)
      .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${desc}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
      .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${title}$2`)
      .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${desc}$2`)
      .replace(
        '<div id="root"></div>',
        `<div id="root"><main><h1>${h1}</h1><p>${desc}</p><nav>${nav}</nav></main></div>`
      )
    if (key === 'home') {
      fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8')
    } else {
      fs.mkdirSync(path.join(distDir, key), { recursive: true })
      fs.writeFileSync(path.join(distDir, key, 'index.html'), html, 'utf8')
    }
  }
}

function seoEnvPlugin(siteUrl) {
  const cleanUrl = (siteUrl || '').replace(/\/+$/, '')
  return {
    name: 'lazarusprotocol-seo-env',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/robots.txt' || req.url === '/sitemap.xml') {
          const filePath = path.resolve(process.cwd(), 'public', req.url.slice(1))
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8').replaceAll('%VITE_SITE_URL%', cleanUrl)
            res.setHeader(
              'Content-Type',
              req.url.endsWith('.xml') ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8'
            )
            res.end(content)
            return
          }
        }
        next()
      })
    },
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist')
      for (const file of ['robots.txt', 'sitemap.xml']) {
        const target = path.join(distDir, file)
        if (fs.existsSync(target)) {
          const content = fs.readFileSync(target, 'utf8').replaceAll('%VITE_SITE_URL%', cleanUrl)
          fs.writeFileSync(target, content, 'utf8')
        }
      }
      prerenderRoutes(distDir, cleanUrl)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'
  const siteUrl = env.VITE_SITE_URL || process.env.VITE_SITE_URL || ''

  return {
    plugins: [react(), tailwindcss(), seoEnvPlugin(siteUrl)],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
