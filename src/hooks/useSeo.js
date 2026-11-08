import { useEffect } from 'react'
import { META } from '../seo/meta'

export const SITE_URL = (
  import.meta.env?.VITE_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/+$/, '')

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

function updateJsonLd(routeKey, meta) {
  const scriptEl = document.getElementById('ld-json-seo')
  if (!scriptEl) return
  try {
    const data = JSON.parse(scriptEl.textContent)
    if (!Array.isArray(data['@graph'])) return

    const pageIdx = data['@graph'].findIndex((item) => item['@type'] === 'WebPage')
    const webPageNode = {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage-${routeKey}`,
      url: `${SITE_URL}${meta.path}`,
      name: meta.title,
      description: meta.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#app` },
      inLanguage: 'en-US',
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'LazarusProtocol',
            item: `${SITE_URL}/`,
          },
          ...(routeKey !== 'home'
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: meta.breadcrumb,
                  item: `${SITE_URL}${meta.path}`,
                },
              ]
            : []),
        ],
      },
    }

    if (pageIdx >= 0) {
      data['@graph'][pageIdx] = webPageNode
    } else {
      data['@graph'].push(webPageNode)
    }
    scriptEl.textContent = JSON.stringify(data)
  } catch {
    // Keep existing static JSON-LD intact if parsing fails
  }
}

/** Updates title, description, canonical, OpenGraph, Twitter, and JSON-LD structured data on route change. */
export function useSeo(route) {
  useEffect(() => {
    const key = META[route] ? route : 'home'
    const m = META[key]
    const canonicalUrl = SITE_URL + m.path

    document.title = m.title
    setMeta('meta[name="description"]', 'content', m.description)
    setMeta('link[rel="canonical"]', 'href', canonicalUrl)
    setMeta('meta[property="og:title"]', 'content', m.title)
    setMeta('meta[property="og:description"]', 'content', m.description)
    setMeta('meta[property="og:url"]', 'content', canonicalUrl)
    setMeta('meta[name="twitter:title"]', 'content', m.title)
    setMeta('meta[name="twitter:description"]', 'content', m.description)

    updateJsonLd(key, m)
  }, [route])
}
