import { useEffect, useState } from 'react'
import { ConnectGate, Page } from '../components/Page'
import { useFeedback } from '../hooks/useFeedback'
import { navigate, queryParam } from '../hooks/useRoute'
import { api, isValidContractId, sanitizeInput } from '../services/api'
import { authorizeVaultAction } from '../services/stellarWallet'

const STROOP_FACTOR = 10000000 // 1 USDC = 10,000,000 stroops (7 decimals)

const usd = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Field({ id, label, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-muted">
        {label}
      </label>
      <input id={id} className="field" {...props} />
    </div>
  )
}

function Toggle({ on, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
        on ? 'bg-blue' : 'bg-line'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full bg-bg transition-all ${
          on ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}

function short(id) {
  if (!id) return ''
  return `${id.slice(0, 6)}…${id.slice(-6)}`
}

export default function Vaults({ wallet }) {
  const { toast, confirm, result } = useFeedback()
  const initialContractParam = queryParam('c') || ''
  const [vaults, setVaults] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(initialContractParam || null)
  const [amount, setAmount] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [vouchers, setVouchers] = useState([])
  const [draft, setDraft] = useState({
    contract: initialContractParam,
    deposit: '100',
    bounty: '0.10',
    protocol: 'blend',
  })

  useEffect(() => {
    let alive = true
    api
      .getContracts()
      .then((data) => {
        if (!alive) return
        const list = Array.isArray(data) ? data : []
        setVaults(list)
        if (initialContractParam && list.some((v) => v.contract_id === initialContractParam)) {
          setSelectedId(initialContractParam)
        } else if (list.length > 0) {
          setSelectedId((prev) => prev || list[0].contract_id)
        }
      })
      .catch((err) => {
        if (alive) {
          setErrorMsg(err?.message || 'Failed to load enrolled contracts from indexer.')
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [initialContractParam])

  const selectedVault = vaults.find((v) => v.contract_id === selectedId) || vaults[0] || null

  // Load vouchers for selected vault
  useEffect(() => {
    let alive = true
    const cid = selectedVault?.contract_id
    if (!cid) return undefined
    api
      .getVouchers(null, cid)
      .then((res) => {
        if (alive) setVouchers(Array.isArray(res) ? res : [])
      })
      .catch(() => {
        if (alive) setVouchers([])
      })
    return () => {
      alive = false
    }
  }, [selectedVault?.contract_id])

  if (!wallet.address) {
    return (
      <Page title="Your vaults">
        <ConnectGate
          wallet={wallet}
          title="Connect with Stellar Wallets Kit to manage your vaults."
          body="Your wallet authorizes contract enrollment and escrow transfers. Multi-wallet support powered by Stellar Wallets Kit."
        />
      </Page>
    )
  }

  const handleToggleActive = async (contractId, currentActive) => {
    if (currentActive) {
      const ok = await confirm({
        title: 'Pause this vault?',
        body: 'Keepers will stop extending TTLs for this contract until you resume it. State may expire.',
        details: [['Contract', short(contractId)]],
        confirmLabel: 'Pause vault',
        tone: 'danger',
      })
      if (!ok) return
    }
    setActionBusy(true)
    setErrorMsg('')
    try {
      const updated = await api.updateContract(
        contractId,
        { is_active: !currentActive },
        wallet.address
      )
      setVaults((vs) =>
        vs.map((v) => (v.contract_id === contractId ? updated : v))
      )
      toast.success(currentActive ? 'Vault paused.' : 'Vault resumed — keepers are warming it again.')
    } catch (err) {
      const msg = err?.message || 'Could not update contract status.'
      setErrorMsg(msg)
      toast.error(msg, { title: 'Update failed' })
    } finally {
      setActionBusy(false)
    }
  }

  const handleDeposit = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0 || !selectedVault) return
    setActionBusy(true)
    setErrorMsg('')
    try {
      const addedStroops = Math.round(val * STROOP_FACTOR)
      const auth = await authorizeVaultAction({
        walletAddress: wallet.address,
        isDemoWallet: wallet.isDemo,
        action: 'deposit_funds',
        targetContract: selectedVault.contract_id,
        amountStroops: addedStroops,
      })
      const currentBalance = Number(selectedVault.escrow_balance) || 0
      const newBalance = currentBalance + addedStroops

      const updated = await api.updateContract(
        selectedVault.contract_id,
        { escrow_balance: newBalance },
        wallet.address
      )
      setVaults((vs) =>
        vs.map((v) =>
          v.contract_id === selectedVault.contract_id ? updated : v
        )
      )
      setAmount('')
      toast.success(
        `${val} USDC added to escrow (${auth.txHash.slice(0, 8)}…).`,
        { title: 'Vault funded' }
      )
    } catch (err) {
      const msg = err?.message || 'Deposit update failed.'
      setErrorMsg(msg)
      toast.error(msg, { title: 'Deposit failed' })
    } finally {
      setActionBusy(false)
    }
  }

  const handleWithdraw = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0 || !selectedVault) return
    const deductStroops = Math.round(val * STROOP_FACTOR)
    const currentBalance = Number(selectedVault.escrow_balance) || 0
    if (deductStroops > currentBalance) {
      const msg = 'Withdrawal amount exceeds available escrow reserve.'
      setErrorMsg(msg)
      toast.warning(msg, { title: 'Amount too high' })
      return
    }
    const ok = await confirm({
      title: 'Confirm withdrawal',
      body: 'Funds leave the escrow reserve that pays keepers. Your vault may run out of bumps sooner.',
      details: [
        ['Amount', `${val} USDC`],
        ['Destination', short(wallet.address)],
      ],
      confirmLabel: 'Confirm withdrawal',
    })
    if (!ok) return
    setActionBusy(true)
    setErrorMsg('')
    try {
      const auth = await authorizeVaultAction({
        walletAddress: wallet.address,
        isDemoWallet: wallet.isDemo,
        action: 'emergency_withdraw',
        targetContract: selectedVault.contract_id,
        amountStroops: deductStroops,
      })
      const newBalance = currentBalance - deductStroops

      const updated = await api.updateContract(
        selectedVault.contract_id,
        { escrow_balance: newBalance },
        wallet.address
      )
      setVaults((vs) =>
        vs.map((v) =>
          v.contract_id === selectedVault.contract_id ? updated : v
        )
      )
      setAmount('')
      toast.success(
        `${val} USDC withdrawn from escrow (${auth.txHash.slice(0, 8)}…).`,
        { title: 'Withdrawal complete' }
      )
    } catch (err) {
      const msg = err?.message || 'Withdrawal update failed.'
      setErrorMsg(msg)
      result({ kind: 'error', title: 'Withdrawal failed', body: msg })
    } finally {
      setActionBusy(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const dep = parseFloat(draft.deposit)
    const b = parseFloat(draft.bounty)
    const contractId = sanitizeInput(draft.contract).toUpperCase()

    if (!isValidContractId(contractId)) {
      const msg = "Please enter a valid 56-character Soroban Contract ID starting with 'C'."
      setErrorMsg(msg)
      toast.error(msg, { title: 'Invalid contract ID' })
      return
    }
    if (!(dep > 0) || !(b > 0)) {
      const msg = 'Please specify positive numbers for initial deposit and fixed bounty.'
      setErrorMsg(msg)
      toast.warning(msg, { title: 'Check your amounts' })
      return
    }

    setActionBusy(true)
    setErrorMsg('')
    try {
      const depositStroops = Math.round(dep * STROOP_FACTOR)
      const auth = await authorizeVaultAction({
        walletAddress: wallet.address,
        isDemoWallet: wallet.isDemo,
        action: 'register_contract',
        targetContract: contractId,
        amountStroops: depositStroops,
      })
      const newContract = await api.createContract({
        contract_id: contractId,
        client_address: wallet.address,
        escrow_balance: depositStroops,
        fixed_bounty: Math.round(b * STROOP_FACTOR),
        min_ledger_threshold: 20000,
        bump_target: 500000,
        protocol_type: draft.protocol,
        is_active: true,
        auto_bootstrap: true,
      })

      setVaults((vs) => [newContract, ...vs.filter((v) => v.contract_id !== newContract.contract_id)])
      setSelectedId(newContract.contract_id)
      setDraft({ contract: '', deposit: '100', bounty: '0.10', protocol: 'blend' })
      result({
        kind: 'success',
        title: 'Contract enrolled',
        body: `${short(contractId)} is now protected. Keepers will start warming its state.`,
        txHash: auth.txHash,
        actionLabel: 'Inspect footprint',
        onAction: () => {
          navigate(`/inspect?c=${encodeURIComponent(contractId)}`)
        },
      })
    } catch (err) {
      const msg = err?.message || 'Failed to enroll contract in LazarusProtocol Vault.'
      setErrorMsg(msg)
      result({ kind: 'error', title: 'Enrollment failed', body: msg })
    } finally {
      setActionBusy(false)
    }
  }

  const escrowUsdc = selectedVault ? Number(selectedVault.escrow_balance) / STROOP_FACTOR : 0
  const bountyUsdc = selectedVault ? Number(selectedVault.fixed_bounty) / STROOP_FACTOR : 0.1
  const bumpsRemaining = bountyUsdc > 0 ? Math.floor(escrowUsdc / (bountyUsdc * 1.05)) : 0

  return (
    <Page
      title="Your vaults"
      intro="Escrow reserve pools fund independent keepers who keep your persistent, instance, and WASM bytecode state warm on Stellar Core. Zero DevOps required."
    >
      {errorMsg && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-red/30 bg-soft p-4 text-sm text-red"
        >
          {errorMsg}
        </div>
      )}

      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        {/* Left: Vault list & enrollment */}
        <section aria-label="Enrolled contracts">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-xl font-bold tracking-tight">Enrolled Contracts</h2>
            <span className="text-xs text-muted font-mono">
              {loading ? 'Loading…' : `${vaults.length} vaults`}
            </span>
          </div>

          {vaults.length > 0 ? (
            <ul>
              {vaults.map((v) => {
                const bal = Number(v.escrow_balance) / STROOP_FACTOR
                const bnt = Number(v.fixed_bounty) / STROOP_FACTOR
                const isSelected = selectedVault?.contract_id === v.contract_id

                return (
                  <li key={v.contract_id} className="rule">
                    <div className="flex items-center gap-4 py-5">
                      <button
                        type="button"
                        onClick={() => setSelectedId(v.contract_id)}
                        aria-current={isSelected}
                        className="flex-1 cursor-pointer text-left"
                      >
                        <span
                          className={`block text-lg font-semibold ${
                            isSelected ? 'text-blue' : ''
                          }`}
                        >
                          {v.protocol_type ? v.protocol_type.toUpperCase() : 'Soroban Contract'}
                        </span>
                        <span className="block font-mono text-sm text-muted">
                          {short(v.contract_id)}
                        </span>
                        <span className="mt-1 block text-sm text-muted">
                          {usd(bal)} USDC · {usd(bnt)} bounty / bump
                        </span>
                      </button>
                      <Toggle
                        on={v.is_active}
                        onChange={() => handleToggleActive(v.contract_id, v.is_active)}
                        disabled={actionBusy}
                        label={`Monitoring for ${v.contract_id}`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rule py-6 text-sm text-muted">
              No contracts enrolled yet. Register your first Soroban contract below.
            </p>
          )}

          {/* Enroll new contract form */}
          <form onSubmit={handleRegister} className="rule mt-6 pt-8">
            <h3 className="text-xl font-bold tracking-tight">Protect a new contract</h3>
            <p className="text-sm text-muted mt-1">
              Enrolls contract into LazarusProtocol Vault escrow with automated 4-stage Hybrid Key Discovery.
            </p>

            <div className="mt-5 grid gap-4">
              <Field
                id="n-contract"
                label="Contract Address (56-char C...)"
                value={draft.contract}
                onChange={(e) => setDraft({ ...draft, contract: e.target.value })}
                placeholder="CA3F7QKD..."
                className="field font-mono text-sm"
              />
              <div>
                <label htmlFor="n-protocol" className="mb-2 block text-sm font-medium text-muted">
                  Protocol Adapter (Pipeline C)
                </label>
                <select
                  id="n-protocol"
                  className="field"
                  value={draft.protocol}
                  onChange={(e) => setDraft({ ...draft, protocol: e.target.value })}
                >
                  <option value="blend">Blend Lending Pool Adapter</option>
                  <option value="soroswap">Soroswap AMM Pair Adapter</option>
                  <option value="generic">Generic Soroban Contract</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="n-dep"
                  label="Initial Escrow Deposit (USDC)"
                  type="number"
                  min="1"
                  step="any"
                  value={draft.deposit}
                  onChange={(e) => setDraft({ ...draft, deposit: e.target.value })}
                  placeholder="100"
                />
                <Field
                  id="n-bounty"
                  label="Bounty Per Extension (USDC)"
                  type="number"
                  min="0.01"
                  step="any"
                  value={draft.bounty}
                  onChange={(e) => setDraft({ ...draft, bounty: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-6" disabled={actionBusy}>
              {actionBusy ? 'Processing…' : 'Register & Deposit Escrow'}
            </button>
          </form>
        </section>

        {/* Right: Selected Vault detail */}
        {selectedVault && (
          <section
            aria-label={`${selectedVault.contract_id} details`}
            className="lg:border-l lg:border-line lg:pl-16"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow">
                {selectedVault.protocol_type
                  ? selectedVault.protocol_type.toUpperCase()
                  : 'ESCROW POOL'}
              </p>
              <a
                href={`/inspect?c=${encodeURIComponent(selectedVault.contract_id)}`}
                className="link text-xs"
              >
                Inspect TTL Heatmap →
              </a>
            </div>
            <p className="mt-3 text-5xl font-extrabold tracking-tight md:text-6xl">
              {usd(escrowUsdc)} <span className="text-2xl font-semibold text-muted">USDC</span>
            </p>
            <p className="mt-2 text-muted">
              in escrow reserve · ~{bumpsRemaining} proactive state bumps funded
            </p>

            <div className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <label htmlFor="amt" className="sr-only">
                Amount in USDC
              </label>
              <input
                id="amt"
                className="field"
                type="number"
                min="0"
                step="any"
                placeholder="Amount (USDC)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionBusy || !amount || parseFloat(amount) <= 0}
                onClick={handleDeposit}
              >
                Deposit
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={
                  actionBusy ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > escrowUsdc
                }
                onClick={handleWithdraw}
              >
                Withdraw
              </button>
            </div>

            <div className="rule mt-10 grid gap-4 pt-8 sm:grid-cols-2">
              <Field
                id="s-bounty"
                label="Fixed Bounty (USDC)"
                type="number"
                min="0"
                step="any"
                readOnly
                value={bountyUsdc}
              />
              <Field
                id="s-th"
                label="Safety Trigger Window (Ledgers)"
                type="number"
                readOnly
                value={selectedVault.min_ledger_threshold || 20000}
              />
              <Field
                id="s-bt"
                label="Target TTL Addition (Ledgers)"
                type="number"
                readOnly
                value={selectedVault.bump_target || 500000}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-muted">
                  Indexed Keys Monitored
                </label>
                <div className="field text-sm font-mono flex items-center">
                  {selectedVault.indexed_keys_count ?? 0} keys
                </div>
              </div>
            </div>

            <h3 className="mt-12 text-lg font-semibold">Attestation &amp; Settlement Activity</h3>
            <ul className="mt-3">
              {vouchers.length > 0 ? (
                vouchers.map((v) => (
                  <li
                    key={v.id || v.signature}
                    className="rule py-3 text-sm text-muted flex justify-between"
                  >
                    <span>
                      Bumped ledger #{v.ledger_bumped} · Nonce #{v.nonce} ·{' '}
                      {v.redeemed ? 'Claimed' : 'Pending'}
                    </span>
                    <span className="font-semibold text-fg">
                      {(Number(v.bounty_amount) / STROOP_FACTOR).toFixed(2)} USDC
                    </span>
                  </li>
                ))
              ) : (
                <li className="rule py-3 text-sm text-muted">
                  No vouchers issued for this contract yet. Keepers are actively monitoring its indexed storage keys.
                </li>
              )}
            </ul>
          </section>
        )}
      </div>
    </Page>
  )
}
