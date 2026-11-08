import { useCallback, useEffect, useState } from 'react'
import { ConnectGate, Page } from '../components/Page'
import { useFeedback } from '../hooks/useFeedback'
import { api } from '../services/api'
import { authorizeVaultAction } from '../services/stellarWallet'

const STROOP_FACTOR = 10000000

function Stat({ label, value, unit }) {
  return (
    <div>
      <p className="text-5xl font-extrabold tracking-tight md:text-6xl">
        {value}
        {unit && <span className="ml-2 text-xl font-semibold text-muted">{unit}</span>}
      </p>
      <p className="mt-2 text-sm text-muted">{label}</p>
    </div>
  )
}

function short(id) {
  if (!id) return ''
  return `${id.slice(0, 6)}…${id.slice(-6)}`
}

export default function Keepers({ wallet }) {
  const { toast, confirm, result } = useFeedback()
  const [keeperInfo, setKeeperInfo] = useState(null)
  const [expiringKeys, setExpiringKeys] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [bumping, setBumping] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const loadKeeperData = useCallback(async (address) => {
    if (!address) return
    setLoading(true)
    setErrorMsg('')
    try {
      try {
        const k = await api.getKeeper(address)
        setKeeperInfo(k)
      } catch (err) {
        if (err.status === 404) {
          setKeeperInfo(null)
        } else {
          throw err
        }
      }

      const exp = await api.getExpiringKeys()
      setExpiringKeys(Array.isArray(exp?.results) ? exp.results : [])

      const vList = await api.getVouchers(address)
      setVouchers(Array.isArray(vList) ? vList : [])
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to load keeper status from indexer.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!wallet.address) return
    const timer = setTimeout(() => {
      loadKeeperData(wallet.address)
    }, 0)
    return () => clearTimeout(timer)
  }, [wallet.address, loadKeeperData])

  const handleRegisterKeeper = async () => {
    setRegistering(true)
    setErrorMsg('')
    try {
      const k = await api.createKeeper({
        keeper_address: wallet.address,
        is_active: true,
      })
      setKeeperInfo(k)
      toast.success('This address is now a registered keeper.', { title: 'Keeper registered' })
    } catch (err) {
      const msg = err?.message || 'Could not register keeper address.'
      setErrorMsg(msg)
      toast.error(msg, { title: 'Registration failed' })
    } finally {
      setRegistering(false)
    }
  }

  const handleSimulateBump = async () => {
    const targetKey = expiringKeys[0]
    if (!targetKey) {
      toast.info('No expiring storage keys in the cohort queue right now.')
      return
    }
    setBumping(true)
    setErrorMsg('')
    try {
      const auth = await authorizeVaultAction({
        walletAddress: wallet.address,
        isDemoWallet: wallet.isDemo,
        action: 'ExtendFootprintTTLOp',
        targetContract: targetKey.contract_id,
        amountStroops: targetKey.fixed_bounty || 1000000,
      })
      const vRes = await api.requestVoucher({
        tx_hash: auth.txHash,
        contract_id: targetKey.contract_id,
        keeper_address: wallet.address,
        ledger_bumped: targetKey.bump_target || 1000000,
        key_hash: targetKey.key_hash,
      })
      await loadKeeperData(wallet.address)
      toast.success(
        `Issued signed BumpVoucher #${vRes?.voucher?.nonce || 1} for ${short(targetKey.contract_id)}.`,
        { title: 'Footprint extended & attested' }
      )
    } catch (err) {
      const msg = err?.message || 'Could not execute keeper state extension.'
      setErrorMsg(msg)
      toast.error(msg, { title: 'Extension failed' })
    } finally {
      setBumping(false)
    }
  }

  const handleClaimVouchers = async () => {
    const unredeemed = vouchers.filter((v) => !v.redeemed)
    if (unredeemed.length === 0) {
      toast.info('No pending vouchers to claim yet.')
      return
    }
    const batch = unredeemed.slice(0, 10)
    const total = batch.reduce((acc, v) => acc + Number(v.bounty_amount) / STROOP_FACTOR, 0)
    const ok = await confirm({
      title: `Claim ${total.toFixed(2)} USDC?`,
      body: 'Up to 10 signed vouchers are redeemed in a single batch to your wallet.',
      details: [
        ['Vouchers', String(batch.length)],
        ['Payout to', short(wallet.address)],
      ],
      confirmLabel: 'Confirm claim',
    })
    if (!ok) return

    setClaiming(true)
    setErrorMsg('')
    try {
      const auth = await authorizeVaultAction({
        walletAddress: wallet.address,
        isDemoWallet: wallet.isDemo,
        action: 'record_bump_batch',
        amountStroops: Math.round(total * STROOP_FACTOR),
      })
      const nonces = batch.map((v) => v.nonce)
      const res = await api.redeemVouchers({
        keeper_address: wallet.address,
        nonces,
      })
      await loadKeeperData(wallet.address)
      result({
        kind: 'success',
        title: 'Payout claimed',
        body: `${total.toFixed(2)} USDC from ${batch.length} voucher${batch.length > 1 ? 's' : ''} is on its way.`,
        txHash: res?.tx_hash || res?.hash || auth.txHash,
      })
    } catch (err) {
      const msg = err?.message || 'Voucher batch redemption failed.'
      setErrorMsg(msg)
      result({
        kind: 'error',
        title: 'Claim failed',
        body: msg,
        actionLabel: 'Try again',
        onAction: handleClaimVouchers,
      })
    } finally {
      setClaiming(false)
    }
  }

  if (!wallet.address) {
    return (
      <Page title="Keeper dashboard">
        <ConnectGate
          wallet={wallet}
          title="Connect your keeper node wallet."
          body="View assigned cohort schedules, confirmed Ed25519 vouchers, and claim batched USDC payouts directly to your address."
        />
      </Page>
    )
  }

  const pendingVouchers = vouchers.filter((v) => !v.redeemed)
  const claimedVouchers = vouchers.filter((v) => v.redeemed)
  const totalEarnedUsdc =
    (Number(keeperInfo?.total_bounties_claimed) || 0) / STROOP_FACTOR ||
    claimedVouchers.reduce((acc, v) => acc + Number(v.bounty_amount) / STROOP_FACTOR, 0)

  return (
    <Page
      title="Keeper dashboard"
      intro="Extend storage TTLs with single-envelope ExtendFootprintTTLOp (up to 100 keys per tx), collect signed vouchers, and redeem up to 10 at a time."
    >
      {errorMsg && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-red/30 bg-soft p-4 text-sm text-red"
        >
          {errorMsg}
        </div>
      )}

      {!keeperInfo && !loading && (
        <div className="rule mt-8 p-6 rounded-3xl bg-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Register this address as a Keeper</h3>
            <p className="text-sm text-muted mt-1">
              Your public key ({short(wallet.address)}) is not yet registered in the keeper cohort index.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary shrink-0"
            onClick={handleRegisterKeeper}
            disabled={registering}
          >
            {registering ? 'Registering…' : 'Register Keeper Address'}
          </button>
        </div>
      )}

      <div className="mt-12 grid gap-10 sm:grid-cols-3">
        <Stat label="Net Earnings Claimed" value={totalEarnedUsdc.toFixed(2)} unit="USDC" />
        <Stat
          label="Vouchers Issued"
          value={keeperInfo?.vouchers_issued_count ?? vouchers.length}
        />
        <Stat
          label="Pending Batch Vouchers (Max 10)"
          value={pendingVouchers.length}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        <button
          type="button"
          className="btn btn-primary"
          disabled={claiming || pendingVouchers.length === 0}
          onClick={handleClaimVouchers}
        >
          {claiming ? 'Submitting Batch…' : `Claim ${pendingVouchers.length} Pending Vouchers`}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={bumping || expiringKeys.length === 0}
          onClick={handleSimulateBump}
        >
          {bumping ? 'Extending & Attesting…' : 'Extend Next Key & Request Voucher'}
        </button>
      </div>

      {/* Expiring keys queue */}
      <section className="mt-16" aria-labelledby="up-next">
        <div className="flex items-center justify-between pb-3 rule">
          <h2 id="up-next" className="text-2xl font-bold tracking-tight">
            Expiring Storage Keys in Cohort Window
          </h2>
          <span className="text-xs text-muted font-mono">
            {expiringKeys.length} expiring {expiringKeys.length === 1 ? 'key' : 'keys'}
          </span>
        </div>

        {expiringKeys.length > 0 ? (
          <ul className="mt-4">
            {expiringKeys.map((q) => (
              <li
                key={q.id || q.key_hash}
                className="rule flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm break-all">
                    {q.key_hash ? `${q.key_hash.slice(0, 18)}…` : 'Storage Entry'}{' '}
                    <span className="text-xs text-faint uppercase">({q.durability})</span>
                  </p>
                  <p className="text-sm text-muted">
                    Contract: {short(q.contract_id)} · {q.remaining_ledgers} ledgers remaining
                    {q.is_emergency && (
                      <span className="ml-2 font-semibold text-red">
                        · Emergency Bypass Active (&le;2,000 ledgers)
                      </span>
                    )}
                  </p>
                </div>
                <a
                  href={`/inspect?c=${encodeURIComponent(q.contract_id)}`}
                  className="link text-sm"
                >
                  Inspect contract →
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-sm text-muted">
            No storage keys are currently below their warming threshold.
          </p>
        )}
      </section>

      {/* Voucher log */}
      <section className="mt-16" aria-labelledby="history">
        <h2 id="history" className="text-2xl font-bold tracking-tight">
          Voucher Attestation History
        </h2>
        {vouchers.length > 0 ? (
          <ul className="mt-4">
            {vouchers.map((h) => (
              <li
                key={h.id || h.signature}
                className="rule grid grid-cols-2 gap-y-1 py-4 text-sm md:grid-cols-[1fr_2fr_1fr_1fr_1fr] md:items-center md:gap-4"
              >
                <span className="text-muted">
                  {h.created_at ? new Date(h.created_at).toLocaleDateString() : 'Issued'}
                </span>
                <span className="font-mono text-xs md:order-none break-all">
                  {short(h.target_contract)}
                </span>
                <span className="text-muted">Nonce #{h.nonce}</span>
                <span>{(Number(h.bounty_amount) / STROOP_FACTOR).toFixed(2)} USDC</span>
                <span className={!h.redeemed ? 'font-semibold text-blue' : 'text-emerald'}>
                  {h.redeemed ? 'Claimed' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-sm text-muted">
            No attestation vouchers issued to {short(wallet.address)} yet.
          </p>
        )}
      </section>

      <p className="mt-12 text-muted">
        Run your own autonomous node?{' '}
        <a href="/docs" className="link">
          Read the Keeper CLI Guide →
        </a>
      </p>
    </Page>
  )
}
