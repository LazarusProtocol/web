import { useCallback, useEffect, useState } from 'react'
import {
  initStellarWalletsKit,
  StellarWalletsKit,
  KitEventType,
  DEMO_WALLET_ADDRESS,
} from '../services/stellarWallet'

export function shorten(addr) {
  return addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : ''
}

function readSavedDemoAddress() {
  try {
    return sessionStorage.getItem('lazarus-demo-wallet-address') || null
  } catch {
    return null
  }
}

export function useWallet(themeMode = 'light') {
  const [address, setAddress] = useState(() => readSavedDemoAddress())
  const [isDemo, setIsDemo] = useState(() => Boolean(readSavedDemoAddress()))
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Initialize Stellar Wallets Kit with current theme
  useEffect(() => {
    initStellarWalletsKit(themeMode)
  }, [themeMode])

  // Restore active address and listen to wallet kit state changes
  useEffect(() => {
    let alive = true

    StellarWalletsKit.getAddress()
      .then((res) => {
        if (alive && res?.address) {
          setAddress(res.address)
          setIsDemo(false)
        }
      })
      .catch(() => {
        // Wallet not connected on load
      })

    const unsub = StellarWalletsKit.on(KitEventType.STATE_UPDATED, (evt) => {
      if (alive && evt?.payload?.address) {
        setAddress(evt.payload.address)
        setIsDemo(false)
      }
    })

    const unsubDisconnect = StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
      if (alive) {
        setAddress(null)
        setIsDemo(false)
      }
    })

    return () => {
      alive = false
      if (typeof unsub === 'function') unsub()
      if (typeof unsubDisconnect === 'function') unsubDisconnect()
    }
  }, [])

  const connect = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      initStellarWalletsKit(themeMode)
      const res = await StellarWalletsKit.authModal()
      if (res?.address) {
        try {
          sessionStorage.removeItem('lazarus-demo-wallet-address')
        } catch {
          // Ignore
        }
        setIsDemo(false)
        setAddress(res.address)
      }
    } catch (e) {
      const msg = e?.message || ''
      if (
        !msg.toLowerCase().includes('close') &&
        !msg.toLowerCase().includes('cancel') &&
        !msg.toLowerCase().includes('dismiss')
      ) {
        setError(msg || 'Could not connect wallet')
      }
    } finally {
      setBusy(false)
    }
  }, [themeMode])

  const connectDemo = useCallback(() => {
    setError(null)
    try {
      sessionStorage.setItem('lazarus-demo-wallet-address', DEMO_WALLET_ADDRESS)
    } catch {
      // Ignore
    }
    setIsDemo(true)
    setAddress(DEMO_WALLET_ADDRESS)
  }, [])

  const openProfile = useCallback(async () => {
    if (isDemo) return
    try {
      await StellarWalletsKit.profileModal()
    } catch (e) {
      console.warn('Profile modal error:', e)
    }
  }, [isDemo])

  const disconnect = useCallback(async () => {
    try {
      sessionStorage.removeItem('lazarus-demo-wallet-address')
    } catch {
      // Ignore
    }
    if (!isDemo) {
      try {
        await StellarWalletsKit.disconnect()
      } catch (e) {
        console.warn('Disconnect error:', e)
      }
    }
    setIsDemo(false)
    setAddress(null)
  }, [isDemo])

  return { address, isDemo, error, busy, connect, connectDemo, disconnect, openProfile }
}
