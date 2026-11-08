import { useCallback, useEffect, useState } from 'react'
import { Page } from '../components/Page'
import { Dot, Legend, RiskLabel } from '../components/Ttl'
import { useFeedback } from '../hooks/useFeedback'
import { navigate, queryParam } from '../hooks/useRoute'
import { api, isValidContractId, sanitizeInput } from '../services/api'

function short(id) {
  if (!id) return ''
  return `${id.slice(0, 6)}…${id.slice(-6)}`
}

function ledgersToDays(ledgers) {
  if (ledgers <= 0) return '0'
  const days = ledgers / 17280
  return days < 1 ? days.toFixed(2) : days.toFixed(1)
}

export default function Inspect({ wallet }) {
  const { toast } = useFeedback()
  const initial = queryParam('c') || ''
  const [input, setInput] = useState(initial)
  const [target, setTarget] = useState(initial)
  const [enrolledContracts, setEnrolledContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [heatmapData, setHeatmapData] = useState(null)
  const [keysList, setKeysList] = useState([])
  const [contractRecord, setContractRecord] = useState(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .getContracts()
      .then((list) => {
        if (!alive) return
        const contracts = Array.isArray(list) ? list : []
        setEnrolledContracts(contracts)
        if (!initial && contracts.length > 0) {
          const firstId = contracts[0].contract_id
          setInput(firstId)
          setTarget(firstId)
        }
      })
      .catch(() => {
        // Ignore if none enrolled yet
      })
    return () => {
      alive = false
    }
  }, [initial])

  const fetchContractData = useCallback(async (contractId) => {
    const cleaned = sanitizeInput(contractId).toUpperCase()
    if (!cleaned) return
    if (!isValidContractId(cleaned)) {
      setError("Invalid Soroban Contract ID. Must be a 56-character StrKey starting with 'C'.")
      return
    }

    setLoading(true)
    setError('')
    try {
      try {
        const record = await api.getContract(cleaned)
        setContractRecord(record)
        setIsEnrolled(true)
      } catch (err) {
        if (err.status === 404) {
          setContractRecord(null)
          setIsEnrolled(false)
        } else {
          throw err
        }
      }

      const diag = await api.getHeatmap(cleaned)
      setHeatmapData(diag)

      const keys = await api.getContractKeys(cleaned)
      setKeysList(Array.isArray(keys) ? keys : [])
    } catch (err) {
      setError(err?.message || 'Failed to query contract storage from indexer.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!target) return
    const timer = setTimeout(() => {
      fetchContractData(target)
    }, 0)
    return () => clearTimeout(timer)
  }, [target, fetchContractData])

  const submit = (e) => {
    e.preventDefault()
    const id = sanitizeInput(input).toUpperCase()
    if (!isValidContractId(id)) {
      setError("Please enter a valid 56-character Soroban Contract ID starting with 'C'.")
      return
    }
    setError('')
    setInput(id)
    setTarget(id)
    navigate(`/inspect?c=${encodeURIComponent(id)}`)
  }

  const handleBootstrap = async () => {
    if (!target) return
    setBootstrapping(true)
    setError('')
    try {
      if (isEnrolled) {
        await api.bootstrapContract(target)
      } else {
        if (!wallet?.address) {
          navigate(`/vaults?c=${encodeURIComponent(target)}`)
          return
        }
        await api.createContract({
          contract_id: target,
          client_address: wallet.address,
          escrow_balance: 1000000000,
          fixed_bounty: 1000000,
          min_ledger_threshold: 20000,
          bump_target: 500000,
          protocol_type: 'blend',
          is_active: true,
          auto_bootstrap: true,
        })
      }
      const updatedList = await api.getContracts()
      if (Array.isArray(updatedList)) setEnrolledContracts(updatedList)
      await fetchContractData(target)
      toast.success(
        isEnrolled ? 'Hybrid discovery completed.' : 'Contract enrolled and bootstrapped.',
        { title: 'Footprint updated' },
      )
    } catch (err) {
      const msg = err?.message || 'Could not run Hybrid Discovery Pipeline on contract.'
      setError(msg)
      toast.error(msg, { title: 'Discovery failed' })
    } finally {
      setBootstrapping(false)
    }
  }

  const allTiers = heatmapData?.tiers || { healthy: [], warming: [], critical: [] }
  const attentionCount =
    (heatmapData?.summary?.warming_count || 0) + (heatmapData?.summary?.critical_count || 0)

  const dots = []
  allTiers.critical.forEach((k) => dots.push({ level: 'critical', ...k }))
  allTiers.warming.forEach((k) => dots.push({ level: 'warming', ...k }))
  allTiers.healthy.forEach((k) => dots.push({ level: 'healthy', ...k }))

  const exportJson = () => {
    const payload = {
      contract_id: target,
      enrolled: isEnrolled,
      protocol_type: contractRecord?.protocol_type || null,
      current_ledger: heatmapData?.current_ledger,
      summary: heatmapData?.summary,
      keys: keysList,
      exported_at: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lazarus-${target.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Page
      title="Inspect a contract"
      intro="Paste any 56-character Soroban contract ID to inspect live storage TTLs, ledger countdowns, and cold-archive risks verified by the LazarusProtocol Indexer."
    >
      <form onSubmit={submit} className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row" role="search">
        <label htmlFor="inspect-id" className="sr-only">
          Contract ID
        </label>
        <input
          id="inspect-id"
          className="field font-mono text-sm"
          placeholder="Paste 56-char Soroban contract ID (C...)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
        <button type="submit" className="btn btn-primary sm:shrink-0" disabled={loading}>
          {loading ? 'Inspecting…' : 'Inspect'}
        </button>
      </form>

      {enrolledContracts.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Enrolled contracts:</span>
          {enrolledContracts.map((c) => (
            <button
              key={c.contract_id}
              type="button"
              className={`font-mono underline cursor-pointer hover:text-fg ${
                target === c.contract_id ? 'text-blue font-semibold' : ''
              }`}
              onClick={() => {
                setInput(c.contract_id)
                setTarget(c.contract_id)
                navigate(`/inspect?c=${encodeURIComponent(c.contract_id)}`)
              }}
            >
              {short(c.contract_id)} ({c.protocol_type})
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          id="inspect-err"
          role="alert"
          className="mt-4 rounded-2xl border border-red/30 bg-soft px-4 py-3 text-sm text-red"
        >
          {error}
        </div>
      )}

      {target && !error && (
        <section className="mt-14" aria-live="polite">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm text-muted break-all">{target}</p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isEnrolled
                      ? 'bg-emerald/15 text-emerald'
                      : 'bg-amber/15 text-amber'
                  }`}
                >
                  {isEnrolled ? `Enrolled (${contractRecord?.protocol_type})` : 'Not Enrolled'}
                </span>
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                {!isEnrolled
                  ? 'Contract not yet enrolled in LazarusProtocol Indexer.'
                  : attentionCount > 0
                    ? `${attentionCount} ${attentionCount === 1 ? 'key needs' : 'keys need'} attention soon.`
                    : keysList.length > 0
                      ? 'All indexed keys healthy.'
                      : 'No storage keys indexed yet.'}
              </h2>
            </div>
            {heatmapData && (
              <span className="text-sm font-mono text-muted">
                Ledger: #{heatmapData.current_ledger}
              </span>
            )}
          </div>

          {dots.length > 0 && (
            <>
              <div
                className="mt-8 flex flex-wrap gap-2.5 max-w-4xl"
                role="img"
                aria-label={`Heatmap of ${dots.length} storage keys`}
              >
                {dots.map((d, i) => (
                  <Dot
                    key={d.key_hash || i}
                    level={d.level}
                    size={22}
                    label={`${d.key_hash} (${d.remaining_ledgers} ledgers left)`}
                  />
                ))}
              </div>

              <div className="mt-6">
                <Legend />
              </div>
            </>
          )}

          {/* Keys list */}
          <div className="mt-12">
            <div className="flex items-center justify-between pb-3 rule">
              <h3 className="text-lg font-semibold">Indexed Storage Keys</h3>
              <span className="text-xs text-muted font-mono">
                {keysList.length} indexed {keysList.length === 1 ? 'key' : 'keys'}
              </span>
            </div>

            {keysList.length > 0 ? (
              <ul>
                <li className="hidden grid-cols-[2fr_1fr_1fr_1.4fr] gap-4 py-2 text-xs font-semibold uppercase tracking-wider text-faint md:grid">
                  <span>Key Hash &amp; LedgerKey XDR</span>
                  <span>Durability</span>
                  <span>Time Remaining</span>
                  <span>Archival Risk</span>
                </li>

                {keysList.map((k) => {
                  const remaining =
                    (k.live_until_ledger_seq || 0) - (heatmapData?.current_ledger || 500000)
                  const days = ledgersToDays(remaining)
                  const level =
                    remaining <= 2000 ? 'critical' : remaining <= 518400 ? 'warming' : 'healthy'

                  return (
                    <li
                      key={k.id || k.key_hash}
                      className="rule grid gap-1 py-4 md:grid-cols-[2fr_1fr_1fr_1.4fr] md:items-center md:gap-4"
                    >
                      <div>
                        <span className="font-mono text-sm break-all">
                          {short(k.key_hash) || k.key_hash}
                        </span>
                        {k.key_xdr && (
                          <span className="block font-mono text-xs text-faint break-all">
                            XDR: {k.key_xdr}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted capitalize">{k.durability}</span>
                      <span className="text-sm">
                        {days} days{' '}
                        <span className="text-xs text-muted">({remaining} ledgers)</span>
                      </span>
                      <RiskLabel level={level} />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="py-8 text-sm text-muted">
                No storage keys are currently indexed for this contract. Enroll this contract in Vaults or run the Hybrid Discovery Pipeline below to index its persistent, instance, and WASM bytecode entries.
              </p>
            )}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row items-center">
            <a
              href={`/vaults?c=${encodeURIComponent(target)}`}
              className="btn btn-primary w-full sm:w-auto"
            >
              {isEnrolled ? 'Manage Vault Escrow' : 'Protect this contract'}
            </a>
            <button
              type="button"
              className="btn btn-outline w-full sm:w-auto"
              onClick={handleBootstrap}
              disabled={bootstrapping}
            >
              {bootstrapping
                ? 'Running Discovery Pipeline…'
                : isEnrolled
                  ? 'Re-run Hybrid Key Discovery'
                  : 'Enroll & Bootstrap Indexer'}
            </button>
            {keysList.length > 0 && (
              <button
                type="button"
                className="btn btn-outline w-full sm:w-auto"
                onClick={exportJson}
              >
                Export JSON
              </button>
            )}
          </div>
        </section>
      )}
    </Page>
  )
}
