import { useEffect, useState } from 'react'
import { href, ROUTES } from '../hooks/useRoute'
import { shorten } from '../hooks/useWallet'

const LABEL = { home: 'Home', inspect: 'Inspect', vaults: 'Vaults', keepers: 'Keepers', docs: 'Docs' }

const Icon = {
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  inspect: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4" />,
  vaults: <path d="M4 8h16v11H4zM8 8V6a4 4 0 0 1 8 0v2" />,
  keepers: <path d="M12 3 4 7v5c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V7l-8-4Z" />,
  docs: <path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6" />,
}

function Svg({ children }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid size-10 place-items-center rounded-full text-fg hover:bg-soft transition-colors cursor-pointer"
    >
      <Svg>
        {dark ? (
          <path d="M12 4V2m0 20v-2M4 12H2m20 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
        )}
      </Svg>
    </button>
  )
}

function WalletPill({ wallet }) {
  if (wallet.address) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="btn btn-outline btn-sm font-mono text-xs md:text-sm"
          onClick={wallet.openProfile}
          title="Open wallet profile"
        >
          <span className="size-2 rounded-full bg-emerald" />
          {shorten(wallet.address)}
        </button>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-full text-muted hover:text-fg hover:bg-soft text-xs cursor-pointer"
          onClick={wallet.disconnect}
          title="Disconnect wallet"
          aria-label="Disconnect wallet"
        >
          ✕
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm whitespace-nowrap"
      onClick={wallet.connect}
      disabled={wallet.busy}
    >
      {wallet.busy ? (
        'Connecting…'
      ) : (
        <span>
          Connect<span className="hidden sm:inline"> Wallet</span>
        </span>
      )}
    </button>
  )
}

export function Header({ route, theme, onToggleTheme, wallet }) {
  const [prevRoute, setPrevRoute] = useState(route)
  const [menuOpen, setMenuOpen] = useState(false)

  // Reset menu when route changes during render
  if (prevRoute !== route) {
    setPrevRoute(route)
    setMenuOpen(false)
  }

  // Close dropdown on Escape key
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-line">
      <div className="relative z-10 mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-5 md:h-16 md:px-8">
        <div className="flex min-w-0 items-center gap-10">
          <a
            href={href('home')}
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg md:gap-2.5 md:text-xl"
          >
            <img
              src="/logo.png"
              alt=""
              width="32"
              height="32"
              className="size-7 rounded-lg border border-line/60 object-contain shadow-xs md:size-8"
            />
            LazarusProtocol
          </a>
          <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
            {ROUTES.map((r) => (
              <a
                key={r}
                href={href(r)}
                aria-current={route === r ? 'page' : undefined}
                className={`text-sm transition-colors hover:text-fg ${
                  route === r ? 'font-semibold text-fg' : 'text-muted'
                }`}
              >
                {LABEL[r]}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <WalletPill wallet={wallet} />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-controls="mobile-nav"
            className="grid size-10 place-items-center rounded-full text-fg hover:bg-soft transition-colors cursor-pointer md:hidden"
          >
            <Svg>
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </Svg>
          </button>
        </div>
      </div>

      {/* Scrim below the header bar */}
      <div
        className={`absolute top-full left-0 h-screen w-full bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Floating dropdown panel */}
      <div
        id="mobile-nav"
        inert={!menuOpen}
        className={`absolute top-full inset-x-0 z-10 px-3 pt-2 transition-all duration-200 ease-out md:hidden ${
          menuOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <nav
          className="mx-auto max-w-md overflow-hidden rounded-2xl border border-line bg-bg p-2 shadow-2xl"
          aria-label="Mobile navigation"
        >
          {['home', ...ROUTES].map((r) => {
            const on = route === r
            return (
              <a
                key={r}
                href={href(r)}
                onClick={() => setMenuOpen(false)}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-colors ${
                  on
                    ? 'bg-soft text-fg font-semibold'
                    : 'text-muted hover:bg-soft/70 hover:text-fg'
                }`}
              >
                <span className={on ? 'text-blue' : 'text-muted'}>
                  <Svg>{Icon[r]}</Svg>
                </span>
                <span>{LABEL[r]}</span>
                {on && <span className="ml-auto size-2 rounded-full bg-blue" />}
              </a>
            )
          })}
        </nav>
      </div>

      {wallet.error && (
        <p role="alert" className="mx-auto max-w-6xl px-5 pb-3 text-sm text-red md:px-8">
          {wallet.error}
        </p>
      )}
    </header>
  )
}

/** Bottom tab bar replaced by smooth header dropdown nav */
export function TabBar() {
  return null
}

export function Footer() {
  return (
    <footer className="rule mt-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          <span className="font-bold text-fg">LazarusProtocol</span> · Decentralized state-rent &amp; proactive state-warming infrastructure for Stellar.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <a className="hover:text-fg transition-colors" href={href('docs')}>
            Docs
          </a>
          <a
            className="hover:text-fg transition-colors"
            href="https://github.com/LazarusProtocol"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            className="hover:text-fg transition-colors"
            href="https://stellar.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Stellar
          </a>
          <a
            className="hover:text-fg transition-colors inline-flex items-center text-muted hover:text-fg"
            href="https://x.com/BossEmmanuel30"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (formerly Twitter)"
            title="X (formerly Twitter)"
          >
            <svg
              className="size-4 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
