import { useEffect, useState } from 'react'
import { Page } from '../components/Page'

const SECTIONS = [
  { id: 'sec-getting-started', title: 'State Rent & Lifecycle' },
  { id: 'sec-architecture', title: 'Architecture & Security Locks' },
  { id: 'sec-for-protocols', title: 'Protocol Enrollment' },
  { id: 'sec-vouchers', title: 'Decoupled Voucher Engine' },
  { id: 'sec-run-keeper', title: 'Run a Keeper Node' },
  { id: 'sec-contracts', title: 'Smart Contract API' },
  { id: 'sec-faq', title: 'Frequently Asked Questions' },
]

const FAQ = [
  [
    'Why can’t a keeper be paid in the same transaction as the TTL extension?',
    'Stellar Core enforces a strict one-Soroban-operation-per-envelope invariant: ExtendFootprintTTLOp (which extends state storage) and InvokeHostFunctionOp (which executes smart contract code to transfer tokens) cannot share a single transaction envelope. Lazarus resolves this constraint by decoupling physical state extension (Phase 1, packing up to 100 storage keys per footprint) from economic settlement (Phase 3, batching up to 10 vouchers into record_bump_batch).',
  ],
  [
    'How does Lazarus compare to the Stellar Development Foundation’s Skeeper?',
    'Skeeper is a single-tenant off-chain cron runner where each team must host their own infrastructure, fund individual XLM wallets, manually discover contract keys, and assume all operational overhead. Lazarus is a decentralized, multi-tenant state maintenance protocol: protocols deposit USDC once into an on-chain non-custodial escrow vault, and an open network of competing keepers performs automated warming in exchange for cryptographically signed bounties.',
  ],
  [
    'Can protocol administrators freeze or steal deposited escrow balances?',
    'No. The LazarusVault smart contract is non-custodial. Client funds can only be disbursed via valid 2-of-3 FROST MPC / Enclave signed BumpVouchers that prove physical ledger extensions, or refunded to the original contract depositor. Any protocol can call emergency_withdraw at any time to instantly reclaim 100% of unspent escrow tokens directly back to their account with zero administrative lock-in.',
  ],
  [
    'What prevents rival keepers from front-running or sniping vouchers?',
    'Every voucher is cryptographically domain-separated and explicitly binds the keeper’s public Stellar address. When record_bump or record_bump_batch executes on-chain, bounty payouts are credited exclusively to the address stamped in the voucher payload. Even if a competing node intercepts a voucher in the public mempool, they cannot redeem the payout to their own wallet.',
  ],
  [
    'How does the network prevent keeper collision and duplicate gas waste?',
    'Keepers utilize deterministic modulo cohort sharding: cohort = hash(contract_id + ledger_key) % TOTAL_COHORTS. By assigning designated key spaces to specific keeper teams or worker nodes, keepers operate in parallel across thousands of ledger entries without redundant ExtendFootprintTTLOp broadcasts or wasted XLM base fees.',
  ],
  [
    'What happens during Stellar ledger latency spikes or chain reorganizations?',
    'The Attestation Oracle queries Soroban RPC getTransaction to verify that a keeper’s extension transaction has attained irreversible ledger consensus and SUCCESS status before signing any voucher. Vouchers are time-stamped with monotonic nonces and checked against confirmed ledger sequences, preventing state desynchronization during temporary node lag.',
  ],
  [
    'How are keeper economics and gas profitability structured?',
    'Keepers pay minimal network base fees in XLM (approx. 100 to 500 stroops) to extend up to 100 keys in a single footprint. When redeeming vouchers in batches of 10, keepers collect USDC bounties (e.g. 0.05 to 0.20 USDC per batch) while amortizing Soroban contract invocation costs across hundreds of keys, achieving net positive operating margins regardless of short-term XLM price volatility.',
  ],
]

function Copy({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded border border-line bg-bg px-2 py-1 text-sm font-medium text-muted hover:text-fg hover:bg-soft transition-colors cursor-pointer"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        } catch {
          /* clipboard unavailable */
        }
      }}
      aria-label={done ? 'Copied to clipboard' : 'Copy command to clipboard'}
    >
      {done ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-fg" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="text-fg font-semibold">Copied</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  )
}

function CodeBlock({ title = 'TERMINAL', code }) {
  return (
    <div className="rounded-lg border border-line bg-soft/40 overflow-hidden min-w-0">
      <div className="flex items-center justify-between border-b border-line/60 bg-soft/30 px-3.5 py-2 text-sm">
        <span className="font-mono text-xs font-medium tracking-wider text-faint uppercase">
          {title}
        </span>
        <Copy text={code} />
      </div>
      <div className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        <pre className="text-fg whitespace-pre">{code}</pre>
      </div>
    </div>
  )
}

function DiagramBox({ x, y, title, sub, tag }) {
  return (
    <g>
      <rect x={x} y={y} width="190" height="64" rx="6" className="fill-bg stroke-line" strokeWidth="1.5" />
      <text x={x + 14} y={y + 18} className="fill-faint font-mono" fontSize="9" letterSpacing="0.8">
        {tag}
      </text>
      <text x={x + 14} y={y + 38} className="fill-fg font-sans" fontSize="13" fontWeight="600">
        {title}
      </text>
      <text x={x + 14} y={y + 54} className="fill-muted font-sans" fontSize="11">
        {sub}
      </text>
    </g>
  )
}

function StepLabel({ x, y, n, text, anchor = 'middle', accent = false }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize="11" className="font-sans fill-muted">
      <tspan fontWeight="700" className={accent ? 'fill-blue' : 'fill-fg'}>{n}</tspan>
      <tspan dx="5">{text}</tspan>
    </text>
  )
}

function WorkflowDiagram() {
  const steps = [
    ['1', 'Escrow', 'Protocol deposits USDC into the vault and sets a fixed bounty.'],
    ['2', 'Discovery', 'The indexer maps every storage key and queues the ones close to expiry.'],
    ['3', 'Extend', 'A keeper extends up to 100 keys in one ExtendFootprintTTLOp.'],
    ['4', 'Attest', 'The oracle checks the transaction on Stellar RPC and signs a voucher.'],
    ['5', 'Settle', 'The keeper redeems up to 10 vouchers in record_bump_batch and gets paid.'],
  ]

  return (
    <figure className="rounded-lg border border-line bg-soft/20 p-4 sm:p-6">
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 800 380"
          className="mx-auto h-auto w-full min-w-[720px]"
          role="img"
          aria-label="Workflow: protocol deposits escrow, indexer feeds keeper, keeper extends TTL, oracle signs voucher, keeper settles on the vault."
        >
          <defs>
            <marker id="wf-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 1 L9 5 L0 9 z" className="fill-muted" />
            </marker>
            <marker id="wf-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 1 L9 5 L0 9 z" className="fill-blue" />
            </marker>
          </defs>

          {/* Connectors */}
          <path d="M210 62 H590" className="stroke-blue" fill="none" strokeWidth="1.5" markerEnd="url(#wf-b)" />
          <path d="M115 94 V160" className="stroke-muted" fill="none" strokeWidth="1.5" markerEnd="url(#wf-a)" />
          <path d="M210 192 H305" className="stroke-muted" fill="none" strokeWidth="1.5" markerEnd="url(#wf-a)" />
          <path d="M495 192 H590" className="stroke-blue" fill="none" strokeWidth="1.5" markerEnd="url(#wf-b)" />
          <path d="M400 224 V290" className="stroke-muted" fill="none" strokeWidth="1.5" markerStart="url(#wf-a)" markerEnd="url(#wf-a)" />
          <path d="M450 160 V127 H685 V94" className="stroke-blue" fill="none" strokeWidth="1.5" strokeDasharray="5 4" markerEnd="url(#wf-b)" />

          {/* Connector labels */}
          <StepLabel x={400} y={52} n="1" text="Deposit USDC escrow" accent />
          <text x={125} y={131} fontSize="11" className="font-sans fill-faint">Contract enrolled</text>
          <StepLabel x={257} y={182} n="2" text="Expiring keys" />
          <StepLabel x={542} y={182} n="3" text="Extend TTL" accent />
          <StepLabel x={412} y={262} n="4" text="Tx hash in, signed voucher out" anchor="start" />
          <StepLabel x={567} y={119} n="5" text="record_bump_batch" accent />

          {/* Nodes */}
          <DiagramBox x={20} y={30} tag="PROTOCOL" title="Protocol Admin" sub="Funds the escrow" />
          <DiagramBox x={590} y={30} tag="ON-CHAIN" title="LazarusVault" sub="Holds USDC, pays keepers" />
          <DiagramBox x={20} y={160} tag="OFF-CHAIN" title="Indexer" sub="Hubble + RPC key discovery" />
          <DiagramBox x={305} y={160} tag="OFF-CHAIN" title="Keeper" sub="Extends TTL, batches vouchers" />
          <DiagramBox x={590} y={160} tag="ON-CHAIN" title="Target Contract" sub="Storage kept alive" />
          <DiagramBox x={305} y={290} tag="OFF-CHAIN" title="Attestation Oracle" sub="Enclave / 2-of-3 FROST" />
        </svg>
      </div>

      <ol className="mt-5 grid gap-x-6 gap-y-3 border-t border-line/60 pt-5 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map(([n, title, body]) => (
          <li key={n} className="text-sm">
            <p className="font-semibold text-fg">
              <span className="font-mono text-muted">{n}.</span> {title}
            </p>
            <p className="mt-1 leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </figure>
  )
}

export default function Docs() {
  const [activeId, setActiveId] = useState('sec-getting-started')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-15% 0px -70% 0px' }
    )

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const scrollTo = (id) => (e) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      setActiveId(id)
    }
  }

  return (
    <Page
      title="Docs"
      intro="Learn how LazarusProtocol maintains Soroban smart contract storage TTL on Stellar, enroll escrow vaults, and run autonomous keepers to earn USDC bounties."
    >
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        {/* TOC Sidebar */}
        <nav
          aria-label="Docs sections"
          className="sticky top-14 z-20 -mx-5 min-w-0 border-b border-line bg-bg/95 px-5 backdrop-blur-md md:top-16 md:-mx-8 md:px-8 lg:top-28 lg:z-auto lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
        >
          <p className="mb-3 hidden text-xs font-mono uppercase tracking-wider text-faint lg:block">
            On this page
          </p>
          <ul className="flex gap-1 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-l lg:border-line lg:py-0 lg:pl-2">
            {SECTIONS.map((s) => {
              const isActive = activeId === s.id
              return (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.id}`}
                    onClick={scrollTo(s.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`block whitespace-nowrap rounded px-2.5 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-soft font-medium text-fg lg:-ml-[9px] lg:rounded-l-none lg:border-l-2 lg:border-blue lg:bg-transparent lg:pl-3 lg:text-blue'
                        : 'text-muted hover:text-fg'
                    }`}
                  >
                    {s.title}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Main Content Area */}
        <div className="min-w-0 max-w-4xl space-y-16">
          {/* Section: State Rent & Lifecycle */}
          <section id="sec-getting-started" className="scroll-mt-32 lg:scroll-mt-28 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">State Rent &amp; Storage Lifecycle</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Soroban implements an active state-rent economic model governed by CAP-0053, CAP-0062, and CAP-0066. Every piece of data written to Stellar ledger storage carries a Time-To-Live (TTL) counter measured in ledgers (approximately 5 seconds per ledger).
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <span className="text-xs font-mono uppercase tracking-wider text-faint">Cold Archival</span>
                <h3 className="mt-1 font-semibold text-base text-fg">Eviction at 0 TTL</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Under CAP-0062, when an entry&apos;s TTL hits 0, it is evicted from active validator memory into archival storage. Any transaction attempting to read or write the entry fails.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <span className="text-xs font-mono uppercase tracking-wider text-faint">Restoration</span>
                <h3 className="mt-1 font-semibold text-base text-fg">10× Fee Penalty</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Recovering archived entries under CAP-0066 requires constructing Merkle inclusion proofs and broadcasting <code className="text-sm">RestoreFootprintOp</code>, which costs up to 10× a normal transaction.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <span className="text-xs font-mono uppercase tracking-wider text-faint">Lazarus</span>
                <h3 className="mt-1 font-semibold text-base text-fg">Preventive Warming</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Lazarus monitors entries and issues lightweight <code className="text-sm">ExtendFootprintTTLOp</code> calls before expiry, preventing cold archival and eliminating expensive restoration fees.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-base font-semibold text-fg">Soroban Storage Entry Types</h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-soft/40 font-mono text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Use Case</th>
                      <th className="p-3">When TTL Hits 0</th>
                      <th className="p-3">Restoration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    <tr>
                      <td className="p-3 font-mono text-fg">Persistent</td>
                      <td className="p-3 text-muted">User balances, pools, contract data</td>
                      <td className="p-3 text-muted">Evicted to Archival Storage</td>
                      <td className="p-3 text-fg">Yes (<code className="text-sm">RestoreFootprintOp</code>)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-fg">Instance</td>
                      <td className="p-3 text-muted">Contract instance &amp; global config</td>
                      <td className="p-3 text-muted">Contract execution disabled</td>
                      <td className="p-3 text-fg">Yes (Restores whole instance)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-fg">ContractCode</td>
                      <td className="p-3 text-muted">Compiled WASM bytecode</td>
                      <td className="p-3 text-muted">Shared WASM code unavailable</td>
                      <td className="p-3 text-fg">Yes (Shared across instances)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-fg">Temporary</td>
                      <td className="p-3 text-muted">Nonces, auth signatures, flash data</td>
                      <td className="p-3 text-muted">Permanently destroyed</td>
                      <td className="p-3 text-faint">No (Irreversible)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Deployment Card */}
            <div className="mt-8 rounded-lg border border-line bg-soft/20 p-5">
              <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-3">
                <span className="text-sm font-mono uppercase tracking-wider text-muted">Stellar Testnet Deployment</span>
                <a
                  href="https://stellar.expert/explorer/testnet/contract/CBKFA2F7RUDGLJNE3K5X2XEXVXRJQ5AMB2NSPREDTATE2ZHDALFKPGUR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue hover:underline inline-flex items-center gap-1"
                >
                  Stellar Expert &rarr;
                </a>
              </div>
              <dl className="mt-3 grid gap-2.5 text-sm font-mono text-muted">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <dt className="text-fg font-sans text-sm">Vault Contract ID:</dt>
                  <div className="flex items-center gap-2">
                    <dd className="break-all text-xs">CBKFA2F7RUDGLJNE3K5X2XEXVXRJQ5AMB2NSPREDTATE2ZHDALFKPGUR</dd>
                    <Copy text="CBKFA2F7RUDGLJNE3K5X2XEXVXRJQ5AMB2NSPREDTATE2ZHDALFKPGUR" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <dt className="text-fg font-sans text-sm">Escrow SAC Token (USDC):</dt>
                  <div className="flex items-center gap-2">
                    <dd className="break-all text-xs">CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC</dd>
                    <Copy text="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <dt className="text-fg font-sans text-sm">Attestation Oracle PubKey:</dt>
                  <div className="flex items-center gap-2">
                    <dd className="break-all text-xs">197f6b23e16c8532c6abc838facd5ea789be0c76b2920334039bfa8b3d368d61</dd>
                    <Copy text="197f6b23e16c8532c6abc838facd5ea789be0c76b2920334039bfa8b3d368d61" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-t border-line/40 pt-2 font-sans">
                  <dt className="text-fg text-sm">Network URLs:</dt>
                  <dd className="text-sm text-muted flex items-center gap-3">
                    <a href="https://lazarusprotocol.online/" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">
                      Web Console
                    </a>
                    <span>•</span>
                    <a href="https://api.lazarusprotocol.online/" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">
                      Indexer API
                    </a>
                    <span>•</span>
                    <a href="https://github.com/LazarusProtocol" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">
                      GitHub
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Section: Architecture & Security Locks */}
          <section id="sec-architecture" className="scroll-mt-32 lg:scroll-mt-28 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Architecture &amp; Security Locks</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Lazarus operates as a three-tier persistence mesh bridging off-chain telemetry with on-chain Soroban escrow. The protocol enforces four cryptographic and economic security locks.
            </p>

            {/* 2D Workflow Diagram */}
            <div className="mt-6">
              <WorkflowDiagram />
            </div>

            <div className="mt-8 space-y-4">
              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded border border-line bg-soft text-sm font-mono text-fg">
                    1
                  </span>
                  <h3 className="font-semibold text-base text-fg">Lock 1: Cryptographic Envelope &amp; Domain Separation</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Every voucher payload strictly enforces the domain header <code className="text-sm">LAZARUS_VOUCHER_V1</code> and concatenates the vault address, keeper address, target contract, bumped ledger sequence, bounty payout, and monotonic nonce:
                </p>
                <div className="mt-2.5 rounded bg-bg p-2.5 font-mono text-xs text-muted overflow-x-auto border border-line/60">
                  <code>payload = &quot;LAZARUS_VOUCHER_V1&quot; + vault_addr + keeper_addr + target_contract + ledger_bumped + bounty_amount + nonce</code>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  The SHA-256 digest is verified on-chain via <code className="text-sm">env.crypto().ed25519_verify()</code>. This prevents cross-contract replay, cross-network replay, or third-party fee hijacking.
                </p>
              </div>

              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded border border-line bg-soft text-sm font-mono text-fg">
                    2
                  </span>
                  <h3 className="font-semibold text-base text-fg">Lock 2: Nonce Hole-Punching Replay Guard</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  To prevent sequential nonce deadlocks when one target contract in a batch deactivates, Lazarus tracks nonces with dual markers:
                </p>
                <ul className="mt-1.5 list-disc list-inside text-sm space-y-1 text-muted">
                  <li><code className="text-sm font-mono">DataKey::RedeemedVoucher(keeper, nonce)</code>: Records consumption per voucher.</li>
                  <li><code className="text-sm font-mono">DataKey::KeeperNonce(keeper)</code>: Tracks the highest observed watermark.</li>
                </ul>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  If an enrolled contract deactivates and voucher #3 cannot be redeemed, the keeper can skip it and settle vouchers #4 through #10 without triggering an invalid nonce error.
                </p>
              </div>

              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded border border-line bg-soft text-sm font-mono text-fg">
                    3
                  </span>
                  <h3 className="font-semibold text-base text-fg">Lock 3: 95/5 Conservation Payout Split</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Keepers receive 100% of their declared bounty amount in SAC USDC. An additional 5% protocol fee (500 bps) is deducted and credited to <code className="text-sm">DataKey::AccumulatedFees</code> for protocol treasury maintenance:
                </p>
                <div className="mt-2.5 rounded bg-bg p-2.5 font-mono text-xs text-muted overflow-x-auto border border-line/60">
                  <code>total_deduction = bounty_amount + (bounty_amount * 500 / 10000)</code>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  The contract checks <code className="text-sm">config.balance &gt;= total_deduction</code> prior to any mutation, preventing escrow insolvency.
                </p>
              </div>

              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded border border-line bg-soft text-sm font-mono text-fg">
                    4
                  </span>
                  <h3 className="font-semibold text-base text-fg">Lock 4: Dual-Tier Hourly Outflow Circuit Breakers</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  To safeguard against malicious signing or oracle compromise, the vault enforces two independent rate limits:
                </p>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 text-sm">
                  <div className="rounded border border-line/60 bg-bg p-2.5">
                    <strong className="text-fg font-medium">Global Hourly Cap:</strong>
                    <p className="mt-1 text-muted">
                      <code className="text-sm">MaxHourlyOutflow</code> limits total outflows across all contracts in any 3,600-second window.
                    </p>
                  </div>
                  <div className="rounded border border-line/60 bg-bg p-2.5">
                    <strong className="text-fg font-medium">Per-Contract Hourly Cap:</strong>
                    <p className="mt-1 text-muted">
                      <code className="text-sm">max_contract_hourly_outflow = max(max_hourly / 2, fixed_bounty * 2)</code> prevents a single contract from exhausting the pool.
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Single fixed bounties are also restricted to at most 20% of the global hourly outflow during registration.
                </p>
              </div>
            </div>
          </section>

          {/* Section: For protocols */}
          <section id="sec-for-protocols" className="scroll-mt-32 lg:scroll-mt-28 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">For Protocols</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Enrolling your Soroban smart contract into Lazarus provides autonomous, non-custodial storage preservation. Your funds remain under your control and are only spent when verified on-chain bumps occur.
            </p>

            <div className="mt-6 rounded-lg border border-line bg-soft/20 p-5">
              <h3 className="font-semibold text-base text-fg">Integration Steps</h3>
              <ol className="mt-3 space-y-3 text-sm sm:text-base text-muted">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm font-medium text-fg shrink-0 mt-0.5">01.</span>
                  <div>
                    <strong className="text-fg">Connect Wallet:</strong>
                    <p className="mt-0.5 text-sm text-muted">
                      Open the <a className="text-blue hover:underline" href="/vaults">Vaults dashboard</a> and connect your Stellar wallet (Freighter, Lobstr, xBull, or Hana).
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm font-medium text-fg shrink-0 mt-0.5">02.</span>
                  <div>
                    <strong className="text-fg">Register Contract ID:</strong>
                    <p className="mt-0.5 text-sm text-muted">
                      Enter your 56-character Soroban Contract ID (starts with &apos;C&apos;). The registry validates that the contract exists on-chain.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm font-medium text-fg shrink-0 mt-0.5">03.</span>
                  <div>
                    <strong className="text-fg">Deposit USDC Escrow &amp; Set Bounty:</strong>
                    <p className="mt-0.5 text-sm text-muted">
                      Deposit initial SAC USDC reserves and configure your fixed bounty rate (e.g., 0.05 to 0.10 USDC per extended batch).
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-sm font-medium text-fg shrink-0 mt-0.5">04.</span>
                  <div>
                    <strong className="text-fg">Automated State Key Discovery:</strong>
                    <p className="mt-0.5 text-sm text-muted">
                      The Lazarus hybrid pipeline indexes all storage entries via Hubble BigQuery and RPC replay, assigning keys into keeper warming cohorts.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Non-Custodial Guarantee */}
            <div className="mt-6 rounded-lg border border-line bg-soft/20 p-5">
              <h3 className="font-semibold text-base text-fg">Non-Custodial Guarantee &amp; Emergency Withdraw</h3>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted">
                Protocols retain sovereignty over their deposited capital. At any time, the registered contract administrator can invoke <code className="text-sm">emergency_withdraw</code> to retrieve 100% of remaining escrow tokens:
              </p>
              <div className="mt-3">
                <CodeBlock
                  title="SOROBAN CLI - EMERGENCY WITHDRAWAL"
                  code="stellar contract invoke \
  --id CBKFA2F7RUDGLJNE3K5X2XEXVXRJQ5AMB2NSPREDTATE2ZHDALFKPGUR \
  --source-account YOUR_ADMIN_KEY \
  --network testnet \
  -- emergency_withdraw \
  --client YOUR_ADMIN_ADDRESS \
  --target YOUR_CONTRACT_ID"
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                If an inactive contract is topped up by its original administrator via <code className="text-sm">deposit_funds</code>, the vault automatically reactivates active monitoring without requiring re-registration.
              </p>
            </div>
          </section>

          {/* Section: Decoupled Voucher Engine */}
          <section id="sec-vouchers" className="scroll-mt-32 lg:scroll-mt-28 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Decoupled Voucher Engine</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Stellar Core enforces a strict constraint: a transaction envelope may only contain one Soroban operation. Physical TTL extensions (<code className="text-sm">ExtendFootprintTTLOp</code>) and smart contract calls (<code className="text-sm">InvokeHostFunctionOp</code>) cannot be executed in the same transaction. Lazarus decouples these into three phases.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <span className="text-xs font-mono uppercase tracking-wider text-faint">Phase 1</span>
                <h3 className="mt-1 font-semibold text-base text-fg">TTL Extension</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  The keeper gathers up to 100 expiring keys into a single footprint and broadcasts an unbundled <code className="text-sm">ExtendFootprintTTLOp</code>. The keeper pays a minimal base fee in XLM.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <span className="text-xs font-mono uppercase tracking-wider text-faint">Phase 2</span>
                <h3 className="mt-1 font-semibold text-base text-fg">Oracle Attestation</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  The keeper submits the transaction hash to the Attestation Oracle. The oracle queries Soroban RPC <code className="text-sm">getTransaction</code> to confirm on-chain consensus before issuing an Ed25519 signature.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-soft/20 p-4">
                <span className="text-xs font-mono uppercase tracking-wider text-faint">Phase 3</span>
                <h3 className="mt-1 font-semibold text-base text-fg">Batch Settlement</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  The keeper submits up to 10 signed vouchers into a single <code className="text-sm">record_bump_batch</code> call on <code className="text-sm">LazarusVault</code>, collecting USDC bounties directly to their wallet.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-semibold text-fg">Voucher Data Structure</h3>
              <div className="mt-3">
                <CodeBlock
                  title="RUST - BUMP VOUCHER STRUCT"
                  code={`#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BumpVoucher {
    pub keeper: Address,          // Recipient keeper node operator
    pub target_contract: Address, // Enrolled contract whose storage was bumped
    pub ledger_bumped: u32,       // Target ledger sequence achieved
    pub bounty_amount: i128,      // Deterministic payout amount (in stroops)
    pub nonce: u64,               // Per-keeper monotonic voucher nonce
}`}
                />
              </div>
            </div>
          </section>

          {/* Section: Run a Keeper Node */}
          <section id="sec-run-keeper" className="scroll-mt-32 lg:scroll-mt-28 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Run a Keeper Node</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Pre-built container packages are published on GitHub under{' '}
              <a
                href="https://github.com/LazarusProtocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue hover:underline"
              >
                github.com/LazarusProtocol
              </a>
              . You can pull the container directly from GitHub Container Registry or run the keeper with Docker Compose.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-fg mb-2">Option A: Pull &amp; Run Container from GitHub Packages</p>
                <CodeBlock
                  title="TERMINAL - DOCKER PULL & RUN"
                  code={`# 1. Pull the keeper image from GitHub Container Registry
docker pull ghcr.io/lazarusprotocol/keeper-daemon:latest

# 2. Run the keeper connected to the Lazarus production API
docker run -d \\
  --name lazarus-keeper \\
  -e LAZARUS_KEEPER_SECRET="S...YOUR_STELLAR_SECRET_KEY" \\
  -e LAZARUS_INDEXER_API_URL="https://api.lazarusprotocol.online" \\
  -e LAZARUS_RPC_URL="https://soroban-testnet.stellar.org" \\
  -e LAZARUS_VAULT_CONTRACT_ID="CBKFA2F7RUDGLJNE3K5X2XEXVXRJQ5AMB2NSPREDTATE2ZHDALFKPGUR" \\
  ghcr.io/lazarusprotocol/keeper-daemon:latest`}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-fg mb-2">Option B: Clone &amp; Run via Docker Compose</p>
                <CodeBlock
                  title="TERMINAL - DOCKER COMPOSE"
                  code={`git clone https://github.com/LazarusProtocol/keeper.git
cd keeper
export LAZARUS_KEEPER_SECRET="S...YOUR_STELLAR_SECRET_KEY"
docker compose up -d`}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-fg mb-2">Option C: Run Directly with Python CLI</p>
                <CodeBlock
                  title="TERMINAL - PYTHON CLI"
                  code={`git clone https://github.com/LazarusProtocol/keeper.git
cd keeper
pip install -r requirements.txt
export LAZARUS_KEEPER_SECRET="S...YOUR_STELLAR_SECRET_KEY"
export LAZARUS_INDEXER_API_URL="https://api.lazarusprotocol.online"
PYTHONPATH=. python3 -m keeper.cli --once`}
                />
              </div>
            </div>

            {/* Environment Variables Reference */}
            <div className="mt-8">
              <h3 className="text-base font-semibold text-fg">Configuration Environment Variables</h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-soft/40 font-mono text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="p-3">Variable</th>
                      <th className="p-3">Default</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60 font-mono text-xs">
                    <tr>
                      <td className="p-3 text-fg">LAZARUS_KEEPER_SECRET</td>
                      <td className="p-3 text-faint">Required</td>
                      <td className="p-3 font-sans text-muted">Stellar secret key (S...) used to sign transactions</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-fg">LAZARUS_INDEXER_API_URL</td>
                      <td className="p-3 text-muted">https://api.lazarusprotocol.online</td>
                      <td className="p-3 font-sans text-muted">Lazarus indexer discovery &amp; attestation endpoint</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-fg">LAZARUS_RPC_URL</td>
                      <td className="p-3 text-muted">https://soroban-testnet.stellar.org</td>
                      <td className="p-3 font-sans text-muted">Soroban RPC server URL for state and consensus queries</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-fg">LAZARUS_VAULT_CONTRACT_ID</td>
                      <td className="p-3 text-muted">CBKFA2...</td>
                      <td className="p-3 font-sans text-muted">LazarusVault Soroban contract ID for bounty redemptions</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-fg">LAZARUS_BUFFER_FLUSH_INTERVAL</td>
                      <td className="p-3 text-muted">600</td>
                      <td className="p-3 font-sans text-muted">Seconds between voucher settlement batch flushes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cohort Sharding */}
            <div className="mt-8 rounded-lg border border-line bg-soft/20 p-4">
              <span className="text-xs font-mono uppercase tracking-wider text-faint">Scalability</span>
              <h3 className="mt-1 font-semibold text-base text-fg">Deterministic Modulo Cohort Sharding</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                To prevent race collisions and duplicate gas waste, keepers partition monitored keys across five independent cohorts using deterministic hashing:
              </p>
              <div className="mt-2.5 rounded bg-bg p-2.5 font-mono text-sm text-muted border border-line/60">
                <code>cohort_id = hash(contract_id + ledger_key) % 5</code>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Keepers subscribe to specific cohorts to operate collaboratively across thousands of entries without redundant broadcasts.
              </p>
            </div>
          </section>

          {/* Section: Smart Contract API */}
          <section id="sec-contracts" className="scroll-mt-32 lg:scroll-mt-28 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Smart Contract API Reference</h2>
            <p className="mt-3 leading-relaxed text-muted">
              The <code className="rounded bg-soft px-1.5 py-0.5 font-mono text-sm">LazarusVault</code> contract is written in Rust using Soroban SDK v27. It handles protocol escrow, voucher signature verification, fee collection, and circuit breakers.
            </p>

            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="rounded-lg border border-line bg-soft/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-fg">initialize</span>
                    <span className="text-xs font-mono text-faint">Admin</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">Initializes contract admin, payment token, oracle pubkey, and global hourly outflow limit.</p>
                  <div className="mt-2">
                    <CodeBlock
                      title="RUST"
                      code="pub fn initialize(e: Env, admin: Address, oracle_pubkey: BytesN<32>, token: Address, max_hourly_outflow: i128) -> Result<(), VaultError>"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-soft/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-fg">register_contract</span>
                    <span className="text-xs font-mono text-faint">Client</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">Registers a protocol contract with initial USDC escrow, fixed bounty rate, and threshold parameters.</p>
                  <div className="mt-2">
                    <CodeBlock
                      title="RUST"
                      code="pub fn register_contract(e: Env, client: Address, target: Address, initial_deposit: i128, fixed_bounty: i128, min_threshold: u32, bump_target: u32) -> Result<(), VaultError>"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-soft/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-fg">deposit_funds</span>
                    <span className="text-xs font-mono text-faint">Client</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">Deposits additional escrow funds. If the vault was previously deactivated, deposits by the client automatically reactivate it.</p>
                  <div className="mt-2">
                    <CodeBlock
                      title="RUST"
                      code="pub fn deposit_funds(e: Env, client: Address, target: Address, amount: i128) -> Result<(), VaultError>"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-soft/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-fg">record_bump_batch</span>
                    <span className="text-xs font-mono text-faint">Public</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">Redeems up to 10 vouchers in a single transaction, disbursing USDC bounties to keepers and collecting 5% protocol fees.</p>
                  <div className="mt-2">
                    <CodeBlock
                      title="RUST"
                      code="pub fn record_bump_batch(e: Env, vouchers: Vec<BumpVoucher>, signatures: Vec<BytesN<64>>) -> Result<(), VaultError>"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-soft/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-fg">emergency_withdraw</span>
                    <span className="text-xs font-mono text-faint">Client</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">Immediately retrieves 100% of remaining escrow funds for the contract depositor and sets is_active to false.</p>
                  <div className="mt-2">
                    <CodeBlock
                      title="RUST"
                      code="pub fn emergency_withdraw(e: Env, client: Address, target: Address) -> Result<(), VaultError>"
                    />
                  </div>
                </div>
              </div>

              {/* Error Codes */}
              <div>
                <h3 className="text-base font-semibold text-fg">Vault Error Codes</h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-soft/40 font-mono text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th className="p-3">Code</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60 font-mono text-xs">
                      <tr>
                        <td className="p-3 text-fg">1</td>
                        <td className="p-3 text-fg">NotInitialized</td>
                        <td className="p-3 font-sans text-muted">Contract has not been initialized with admin keys</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-fg">2</td>
                        <td className="p-3 text-fg">AlreadyInitialized</td>
                        <td className="p-3 font-sans text-muted">Initialization attempted on an already active vault</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-fg">3</td>
                        <td className="p-3 text-fg">ContractInactive</td>
                        <td className="p-3 font-sans text-muted">Target contract is inactive or not registered</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-fg">4</td>
                        <td className="p-3 text-fg">InsufficientEscrow</td>
                        <td className="p-3 font-sans text-muted">Contract escrow balance is insufficient to cover payout</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-fg">5</td>
                        <td className="p-3 text-fg">InvalidNonce</td>
                        <td className="p-3 font-sans text-muted">Voucher nonce is zero or has already been redeemed</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-fg">6</td>
                        <td className="p-3 text-fg">BountyMismatch</td>
                        <td className="p-3 font-sans text-muted">Voucher bounty amount differs from contract policy</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-fg">10</td>
                        <td className="p-3 text-fg">BatchSizeExceeded</td>
                        <td className="p-3 font-sans text-muted">Batch exceeds MAX_BATCH_SIZE (10 vouchers)</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-fg">13</td>
                        <td className="p-3 text-fg">HourlyOutflowExceeded</td>
                        <td className="p-3 font-sans text-muted">Hourly outflow circuit breaker ceiling reached</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-fg">15</td>
                        <td className="p-3 text-fg">AlreadyRegistered</td>
                        <td className="p-3 font-sans text-muted">Registration attempted for an already active contract</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Section: FAQ */}
          <section id="sec-faq" className="scroll-mt-32 lg:scroll-mt-28 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
            <div className="mt-6 divide-y divide-line rounded-lg border border-line overflow-hidden bg-soft/20">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group p-4 transition-colors hover:bg-soft/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-fg">
                    <span className="text-base">{q}</span>
                    <span
                      className="font-mono text-sm text-muted transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2.5 leading-relaxed text-sm sm:text-base text-muted">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Page>
  )
}
