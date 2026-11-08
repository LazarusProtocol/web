import { useState } from 'react'
import { href, navigate } from '../hooks/useRoute'
import { isValidContractId, sanitizeInput } from '../services/api'

const PROBLEMS = [
  [
    'State expires quietly',
    'Persistent, Instance, and ContractCode Soroban entries carry a TTL counter. When it hits zero they are evicted to the disk archive under CAP-0062.',
  ],
  [
    'First user pays the price',
    'Under CAP-0066, reactively restoring cold state can cost up to 10x a normal invocation, penalizing whichever user touches the contract first.',
  ],
  [
    'Shared state has no payer',
    'Public AMM pools, lending reserves, and oracle registries belong to everyone, so no individual user has an economic incentive to keep them warm.',
  ],
]

const STEPS = [
  [
    'Keepers extend state',
    'Independent node operators pack up to 100 expiring keys per contract and broadcast unbundled ExtendFootprintTTLOp transactions before archival.',
  ],
  [
    'LazarusProtocol attests',
    'The ingestion engine verifies on-chain ledger inclusion and issues a domain-separated Ed25519 / 2-of-3 FROST signed BumpVoucher.',
  ],
  [
    'The vault pays',
    'Keepers redeem vouchers in batches of up to 10 via record_bump_batch and receive deterministic SAC bounties from your non-custodial escrow.',
  ],
]

const AUDIENCE = [
  [
    'Protocol teams',
    'Deposit once, configure fixed bounties with per-contract circuit breakers, and stop running fragile cron workers.',
    'vaults',
    'Protect a contract',
  ],
  [
    'Keeper operators',
    'Run an autonomous Docker node with deterministic cohort sharding, extend state, and earn continuous yield on Stellar.',
    'keepers',
    'Open Keeper Dashboard',
  ],
  [
    'Observers and auditors',
    'Inspect the live storage health, Instance/WASM bytecode TTLs, and archival risk of any Soroban contract in real time.',
    'inspect',
    'Inspect a contract',
  ],
]

export default function Home() {
  const [id, setId] = useState('')
  const [inputErr, setInputErr] = useState('')

  const go = (e) => {
    e.preventDefault()
    const cleaned = sanitizeInput(id).toUpperCase()
    if (cleaned && !isValidContractId(cleaned)) {
      setInputErr(
        "Please enter a valid 56-character Soroban Contract ID starting with 'C' (or leave blank to inspect enrolled contracts)."
      )
      return
    }
    setInputErr('')
    navigate(cleaned ? `/inspect?c=${encodeURIComponent(cleaned)}` : '/inspect')
  }

  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 md:px-8 md:pt-24 md:pb-28">
        <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.03] tracking-tight md:text-8xl">
          Keep your Soroban state alive.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">
          LazarusProtocol is a decentralized keeper network that proactively extends contract storage TTL on Stellar, so your users never pay for cold-storage restoration.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a href={href('vaults')} className="btn btn-primary">
            Protect a contract
          </a>
        </div>

        <form onSubmit={go} className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row" role="search">
          <label htmlFor="home-contract" className="sr-only">
            Contract ID
          </label>
          <input
            id="home-contract"
            className="field font-mono text-sm"
            placeholder="Enter 56-char Soroban Contract ID (C...)"
            value={id}
            onChange={(e) => {
              setId(e.target.value)
              if (inputErr) setInputErr('')
            }}
            autoComplete="off"
            spellCheck="false"
          />
          <button type="submit" className="btn btn-outline sm:shrink-0">
            Inspect
          </button>
        </form>
        {inputErr && (
          <p role="alert" className="mt-2 text-xs text-red">
            {inputErr}
          </p>
        )}
      </section>

      <section className="rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="eyebrow">The problem</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-5xl">
            Soroban state expires if left unattended.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
            {PROBLEMS.map(([t, d]) => (
              <div key={t}>
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="mt-2 leading-relaxed text-muted text-sm md:text-base">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-5xl">
            Automated persistence in three steps.
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="text-4xl font-bold text-blue">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-lg font-semibold">{t}</h3>
                <p className="mt-2 leading-relaxed text-muted text-sm md:text-base">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <p className="eyebrow">Ecosystem personas</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Built for the Stellar ecosystem.
          </h2>
          <ul className="mt-10">
            {AUDIENCE.map(([t, d, r, cta]) => (
              <li
                key={t}
                className="rule flex flex-col gap-3 py-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="text-xl font-semibold">{t}</h3>
                  <p className="mt-1 text-muted text-sm md:text-base">{d}</p>
                </div>
                <a href={href(r)} className="link shrink-0">
                  {cta} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
