import { useEffect, useState } from 'react'

export const ROUTES = ['inspect', 'vaults', 'keepers', 'docs']
const NAV_EVENT = 'lazarus:navigate'

/** Old links used `/#/docs`; rewrite them to `/docs` so shared URLs keep working. */
function upgradeLegacyHash() {
  const h = window.location.hash
  if (h.startsWith('#/')) {
    window.history.replaceState(null, '', h.slice(1))
  }
}

function readRoute() {
  const seg = window.location.pathname.replace(/^\/+|\/+$/g, '')
  return ROUTES.includes(seg) ? seg : 'home'
}

export function queryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || ''
}

/** Client-side navigation to an internal path, e.g. `/inspect?c=C...`. */
export function navigate(to) {
  window.history.pushState(null, '', to)
  window.dispatchEvent(new Event(NAV_EVENT))
}

/**
 * History-API router. Tracks route name and query string so query changes on the
 * same route (`/inspect?c=A` -> `/inspect?c=B`) trigger updates.
 */
export function useRoute() {
  const [state, setState] = useState(() => {
    upgradeLegacyHash()
    return { route: readRoute(), search: window.location.search }
  })

  useEffect(() => {
    const sync = () => {
      setState({ route: readRoute(), search: window.location.search })
    }
    const onNavigate = () => {
      sync()
      window.scrollTo(0, 0)
    }
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a[href]')
      if (!a || a.target || a.hasAttribute('download')) return
      const to = a.getAttribute('href')
      if (!to.startsWith('/') || to.startsWith('//')) return
      e.preventDefault()
      navigate(to)
    }
    window.addEventListener('popstate', sync)
    window.addEventListener(NAV_EVENT, onNavigate)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(NAV_EVENT, onNavigate)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return state
}

export const href = (r, queryParams = null) => {
  const base = r === 'home' ? '/' : `/${r}`
  if (!queryParams) return base
  const qs = new URLSearchParams(queryParams).toString()
  return qs ? `${base}?${qs}` : base
}
