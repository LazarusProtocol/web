import { useEffect, useRef } from 'react'
import { Footer, Header } from './components/Layout'
import { FeedbackProvider } from './components/Feedback'
import { useFeedback } from './hooks/useFeedback'
import { useRoute } from './hooks/useRoute'
import { useSeo } from './hooks/useSeo'
import { useTheme } from './hooks/useTheme'
import { shorten, useWallet } from './hooks/useWallet'
import Docs from './pages/Docs'
import Home from './pages/Home'
import Inspect from './pages/Inspect'
import Keepers from './pages/Keepers'
import Vaults from './pages/Vaults'

/** Surfaces wallet connect / disconnect / error events as toasts. */
function useWalletToasts(wallet) {
  const { toast } = useFeedback()
  const prev = useRef(wallet.address)

  useEffect(() => {
    if (prev.current !== wallet.address) {
      if (wallet.address) {
        toast.success(`Connected as ${shorten(wallet.address)}`, { title: 'Wallet connected' })
      } else if (prev.current) {
        toast.info('Your wallet was disconnected.', { title: 'Wallet disconnected' })
      }
      prev.current = wallet.address
    }
  }, [wallet.address, toast])

  useEffect(() => {
    if (wallet.error) toast.error(wallet.error, { title: 'Wallet error' })
  }, [wallet.error, toast])
}

function Shell() {
  const { route, search } = useRoute()
  const { theme, toggle } = useTheme()
  const wallet = useWallet(theme)
  useSeo(route)
  useWalletToasts(wallet)

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.querySelector('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[80] focus:rounded-full focus:bg-bg focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Header route={route} theme={theme} onToggleTheme={toggle} wallet={wallet} />
      <div className="flex-1">
        {route === 'home' && <Home />}
        {route === 'inspect' && <Inspect key={search} wallet={wallet} />}
        {route === 'vaults' && <Vaults key={search} wallet={wallet} />}
        {route === 'keepers' && <Keepers wallet={wallet} />}
        {route === 'docs' && <Docs />}
      </div>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <FeedbackProvider>
      <Shell />
    </FeedbackProvider>
  )
}

export default App
