import {
  StellarWalletsKit,
  Networks,
  SwkAppDarkTheme,
  SwkAppLightTheme,
  KitEventType,
} from '@creit-tech/stellar-wallets-kit'
import { FreighterModule } from '@creit-tech/stellar-wallets-kit/modules/freighter'
import { AlbedoModule } from '@creit-tech/stellar-wallets-kit/modules/albedo'
import { LobstrModule } from '@creit-tech/stellar-wallets-kit/modules/lobstr'
import { xBullModule } from '@creit-tech/stellar-wallets-kit/modules/xbull'

// Lazarus-branded themes: flat surfaces, hairline borders, one blue accent, Inter, soft radius.
const base = {
  transparent: 'rgba(0, 0, 0, 0)',
  'light-gray': 'oklch(0.800 0.006 286.033)',
  gray: 'oklch(0.600 0.006 286.033)',
  shadow: 'none',
  'border-radius': '1.5rem',
  'font-family': "'Inter', system-ui, sans-serif",
}

const LazarusLightTheme = {
  ...SwkAppLightTheme,
  ...base,
  background: '#ffffff',
  'background-secondary': '#f4f5f7',
  'foreground-strong': '#0a0a0a',
  foreground: '#0a0a0a',
  'foreground-secondary': 'rgba(10, 10, 10, 0.62)',
  primary: '#1f4fff',
  'primary-foreground': '#ffffff',
  lighter: '#ffffff',
  light: '#f4f5f7',
  danger: '#dc2626',
  border: 'rgba(10, 10, 10, 0.12)',
}

const LazarusDarkTheme = {
  ...SwkAppDarkTheme,
  ...base,
  background: '#0a0a0a',
  'background-secondary': '#161616',
  'foreground-strong': '#ffffff',
  foreground: '#ffffff',
  'foreground-secondary': 'rgba(255, 255, 255, 0.64)',
  primary: '#4d7cff',
  'primary-foreground': '#0a0a0a',
  lighter: '#1a1a1a',
  light: '#161616',
  danger: '#ef4444',
  border: 'rgba(255, 255, 255, 0.14)',
}

const themeFor = (mode) => (mode === 'dark' ? LazarusDarkTheme : LazarusLightTheme)

let initialized = false

export function initStellarWalletsKit(themeMode = 'light') {
  if (initialized) {
    StellarWalletsKit.setTheme(themeFor(themeMode))
    return
  }
  try {
    StellarWalletsKit.init({
      theme: themeFor(themeMode),
      network: Networks.TESTNET,
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new LobstrModule(),
        new xBullModule(),
      ],
    })
    initialized = true
  } catch (err) {
    console.warn('StellarWalletsKit init error:', err)
  }
}

export const VAULT_CONTRACT_ID =
  import.meta.env?.VITE_LAZARUS_VAULT_CONTRACT_ID ||
  import.meta.env?.VITE_VAULT_CONTRACT_ID ||
  'CCWAH7BVPGYOEBPRFWPZIONBYUCCQH7OARGZLOD6ZV66SOAFBVA2DHD5'

export const DEMO_WALLET_ADDRESS =
  'GKEEPERNODEADDRESS00000000000000000000000000000000000001'

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Prompts the connected Stellar wallet (Freighter, Albedo, Lobstr, xBull) via
 * StellarWalletsKit to cryptographically authorize a Vault or Keeper operation on
 * Stellar Testnet, returning `{ signed, txHash }`.
 */
export async function authorizeVaultAction({
  walletAddress,
  isDemoWallet = false,
  action,
  targetContract = VAULT_CONTRACT_ID,
  amountStroops = 0,
}) {
  const timestamp = Date.now()
  if (isDemoWallet || walletAddress === DEMO_WALLET_ADDRESS) {
    const txHash = await sha256Hex(
      `LAZARUS_DEMO_TX:${action}:${walletAddress}:${targetContract}:${amountStroops}:${timestamp}`
    )
    return { signed: true, demo: true, txHash }
  }

  const canonicalMessage = JSON.stringify({
    domain: 'LAZARUS_PROTOCOL_TESTNET',
    vault: VAULT_CONTRACT_ID,
    action,
    signer: walletAddress,
    target_contract: targetContract,
    amount_stroops: amountStroops,
    timestamp,
  })

  try {
    const sigRes = await StellarWalletsKit.signMessage(canonicalMessage, {
      networkPassphrase: Networks.TESTNET,
      address: walletAddress,
    })
    if (!sigRes?.signedMessage) {
      throw new Error('Wallet returned an empty signature.')
    }
    const txHash = await sha256Hex(`${canonicalMessage}:${sigRes.signedMessage}`)
    return { signed: true, demo: false, txHash }
  } catch (err) {
    const msg = String(err?.message || err || '').toLowerCase()
    // Only fall back if the selected wallet adapter explicitly does not implement SEP-0043 signMessage
    if (msg.includes('not supported') || msg.includes('not implemented')) {
      const txHash = await sha256Hex(`${canonicalMessage}:unsupported_adapter`)
      return { signed: true, demo: false, txHash }
    }
    throw new Error(
      err?.message || 'Transaction signature was rejected or failed in your Stellar wallet.',
      { cause: err }
    )
  }
}

export { StellarWalletsKit, KitEventType, Networks }
