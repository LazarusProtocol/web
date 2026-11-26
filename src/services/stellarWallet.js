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
import {
  Address,
  BASE_FEE,
  Contract,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc as SorobanRpc,
  xdr,
} from '@stellar/stellar-sdk'

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
  'CBKFA2F7RUDGLJNE3K5X2XEXVXRJQ5AMB2NSPREDTATE2ZHDALFKPGUR'

export const SOROBAN_RPC_URL =
  import.meta.env?.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'

export const SOROBAN_MAINNET_RPC_URL =
  import.meta.env?.VITE_SOROBAN_MAINNET_RPC_URL || 'https://mainnet.sorobanrpc.com'

export const NETWORK_PASSPHRASE =
  import.meta.env?.VITE_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET

export const DEMO_WALLET_ADDRESS =
  'GKEEPERNODEADDRESS00000000000000000000000000000000000001'

function createRpcServer(rpcUrl = SOROBAN_RPC_URL) {
  return new SorobanRpc.Server(rpcUrl, {
    allowHttp: rpcUrl.startsWith('http://'),
  })
}

async function sha256BytesHex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Queries live Soroban RPC (`getLatestLedger` + `getLedgerEntries`) for any
 * Soroban contract on Testnet or Mainnet, returning real on-chain TTLs for its
 * `ContractInstance` and `ContractCode` (WASM bytecode) entries.
 */
export async function inspectContractOnChain(contractId, network = 'testnet') {
  const rpcUrl = network === 'mainnet' ? SOROBAN_MAINNET_RPC_URL : SOROBAN_RPC_URL
  const server = createRpcServer(rpcUrl)
  const latest = await server.getLatestLedger()
  const currentLedger = Number(latest.sequence)

  const instanceKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    })
  )

  const instResp = await server.getLedgerEntries(instanceKey)
  const instEntry = instResp?.entries?.[0]
  if (!instEntry) {
    return {
      found: false,
      network,
      current_ledger: currentLedger,
      wasm_hash: null,
      keys: [],
    }
  }

  const instRawXdr = instanceKey.toXDR()
  const instHash = await sha256BytesHex(instRawXdr)
  const keys = [
    {
      id: `rpc-instance-${instHash}`,
      contract_id: contractId,
      key_hash: instHash,
      key_xdr: instanceKey.toXDR('base64'),
      durability: 'instance',
      live_until_ledger_seq: Number(instEntry.liveUntilLedgerSeq || 0),
      source: 'soroban-rpc',
    },
  ]

  let wasmHashHex = null
  try {
    const executable = instEntry.val.contractData().val().instance().executable()
    if (executable?.switch?.().name === 'contractExecutableWasm') {
      const wasmHashBytes = executable.wasmHash()
      wasmHashHex = bytesToHex(wasmHashBytes)
      const codeKey = xdr.LedgerKey.contractCode(
        new xdr.LedgerKeyContractCode({ hash: wasmHashBytes })
      )
      const codeResp = await server.getLedgerEntries(codeKey)
      const codeEntry = codeResp?.entries?.[0]
      if (codeEntry) {
        const codeHash = await sha256BytesHex(codeKey.toXDR())
        keys.push({
          id: `rpc-code-${codeHash}`,
          contract_id: contractId,
          key_hash: codeHash,
          key_xdr: codeKey.toXDR('base64'),
          durability: 'contract_code',
          live_until_ledger_seq: Number(codeEntry.liveUntilLedgerSeq || 0),
          wasm_hash: wasmHashHex,
          source: 'soroban-rpc',
        })
      }
    }
  } catch (err) {
    console.warn('Could not extract ContractCode WASM entry:', err)
  }

  return {
    found: true,
    network,
    current_ledger: currentLedger,
    wasm_hash: wasmHashHex,
    keys,
  }
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex) {
  const clean = String(hex || '').replace(/^0x/i, '').trim()
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex signature length.')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function buildBumpVoucherScVal(v) {
  const keeperAddr = v.keeper || v.keeper_address
  const targetAddr = v.target_contract || v.contract_id
  // Soroban #[contracttype] struct fields sorted alphabetically as ScMap entries
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('bounty_amount'),
      val: nativeToScVal(BigInt(v.bounty_amount), { type: 'i128' }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('keeper'),
      val: new Address(keeperAddr).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('ledger_bumped'),
      val: nativeToScVal(Number(v.ledger_bumped), { type: 'u32' }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('nonce'),
      val: nativeToScVal(BigInt(v.nonce), { type: 'u64' }),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('target_contract'),
      val: new Address(targetAddr).toScVal(),
    }),
  ])
}

async function submitAndConfirmSorobanTx({ server, tx, walletAddress }) {
  const sim = await server.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Soroban simulation failed: ${sim.error}`)
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build()
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: walletAddress,
  })
  if (!signedTxXdr) {
    throw new Error('Wallet returned an empty signed transaction.')
  }

  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
  const sendResp = await server.sendTransaction(signedTx)
  if (sendResp.status === 'ERROR') {
    const errDetail = sendResp.errorResult
      ? JSON.stringify(sendResp.errorResult)
      : sendResp.status
    throw new Error(`Transaction rejected by Soroban RPC: ${errDetail}`)
  }

  const txHash = sendResp.hash
  for (let attempt = 0; attempt < 20; attempt++) {
    const statusResp = await server.getTransaction(txHash)
    if (statusResp.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        signed: true,
        demo: false,
        onChain: true,
        txHash,
        ledger: statusResp.ledger,
      }
    }
    if (statusResp.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`On-chain transaction ${txHash} failed during execution.`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  return {
    signed: true,
    demo: false,
    onChain: true,
    pending: true,
    txHash,
  }
}

/**
 * Builds, simulates, signs via StellarWalletsKit, and submits a real Soroban
 * transaction on Stellar for LazarusVault or ExtendFootprintTTL operations.
 * Falls back to deterministic synthetic hashes ONLY when using the explicit
 * Demo Wallet mode.
 */
export async function authorizeVaultAction({
  walletAddress,
  isDemoWallet = false,
  action,
  targetContract = VAULT_CONTRACT_ID,
  amountStroops = 0,
  fixedBountyStroops = 0,
  minThreshold = 20000,
  bumpTarget = 500000,
  keyXdr = null,
  extendTo = 0,
  vouchers = null,
}) {
  const timestamp = Date.now()
  if (isDemoWallet || walletAddress === DEMO_WALLET_ADDRESS) {
    const txHash = await sha256Hex(
      `LAZARUS_DEMO_TX:${action}:${walletAddress}:${targetContract}:${amountStroops}:${timestamp}`
    )
    return { signed: true, demo: true, onChain: false, txHash }
  }

  const server = createRpcServer()
  const account = await server.getAccount(walletAddress)
  const vault = new Contract(VAULT_CONTRACT_ID)
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).setTimeout(60)

  if (action === 'register_contract') {
    builder.addOperation(
      vault.call(
        'register_contract',
        new Address(walletAddress).toScVal(),
        new Address(targetContract).toScVal(),
        nativeToScVal(BigInt(amountStroops), { type: 'i128' }),
        nativeToScVal(BigInt(fixedBountyStroops), { type: 'i128' }),
        nativeToScVal(Number(minThreshold), { type: 'u32' }),
        nativeToScVal(Number(bumpTarget), { type: 'u32' })
      )
    )
  } else if (action === 'deposit_funds') {
    builder.addOperation(
      vault.call(
        'deposit_funds',
        new Address(walletAddress).toScVal(),
        new Address(targetContract).toScVal(),
        nativeToScVal(BigInt(amountStroops), { type: 'i128' })
      )
    )
  } else if (action === 'emergency_withdraw') {
    builder.addOperation(
      vault.call(
        'emergency_withdraw',
        new Address(walletAddress).toScVal(),
        new Address(targetContract).toScVal()
      )
    )
  } else if (action === 'record_bump_batch') {
    if (!Array.isArray(vouchers) || vouchers.length === 0) {
      throw new Error('record_bump_batch requires at least one signed voucher.')
    }
    const voucherScVals = vouchers.map((v) => buildBumpVoucherScVal(v))
    const sigScVals = vouchers.map((v) => {
      const sigBytes = hexToBytes(v.signature)
      if (sigBytes.length !== 64) {
        throw new Error(`Invalid Ed25519 signature length (${sigBytes.length} bytes).`)
      }
      return xdr.ScVal.scvBytes(sigBytes)
    })
    builder.addOperation(
      vault.call(
        'record_bump_batch',
        xdr.ScVal.scvVec(voucherScVals),
        xdr.ScVal.scvVec(sigScVals)
      )
    )
  } else if (action === 'ExtendFootprintTTLOp') {
    if (!keyXdr) {
      throw new Error('ExtendFootprintTTLOp requires a base64 LedgerKey XDR.')
    }
    const ledgerKey = xdr.LedgerKey.fromXDR(keyXdr, 'base64')
    const sorobanData = new xdr.SorobanTransactionData({
      ext: new xdr.ExtensionPoint(0),
      resources: new xdr.SorobanResources({
        footprint: new xdr.LedgerFootprint({
          readOnly: [ledgerKey],
          readWrite: [],
        }),
        instructions: 0,
        diskReadBytes: 0,
        writeBytes: 0,
      }),
      resourceFee: xdr.Int64.fromString('0'),
    })
    builder
      .addOperation(Operation.extendFootprintTtl({ extendTo: Number(extendTo || bumpTarget) }))
      .setSorobanData(sorobanData)
  } else {
    throw new Error(`Unsupported Soroban vault action: ${action}`)
  }

  const tx = builder.build()
  return submitAndConfirmSorobanTx({ server, tx, walletAddress })
}

export { StellarWalletsKit, KitEventType, Networks }
