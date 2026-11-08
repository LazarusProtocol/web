const BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '')
const DEFAULT_TIMEOUT_MS = 10000

const CONTRACT_ID_RE = /^C[A-Z0-9]{55}$/
const STELLAR_ADDR_RE = /^[GC][A-Z0-9]{55}$/
export function sanitizeInput(value) {
  if (typeof value !== 'string') return ''
  return Array.from(value.trim())
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code > 0x1f && code !== 0x7f && ch !== '<' && ch !== '>'
    })
    .join('')
}

export function isValidContractId(value) {
  const cleaned = sanitizeInput(value).toUpperCase()
  return CONTRACT_ID_RE.test(cleaned)
}

export function isValidStellarAddress(value) {
  const cleaned = sanitizeInput(value).toUpperCase()
  return STELLAR_ADDR_RE.test(cleaned)
}

function formatApiError(data, fallback) {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data.error === 'string') return data.error
  if (typeof data.detail === 'string') return data.detail
  if (typeof data === 'object') {
    const messages = []
    for (const [field, val] of Object.entries(data)) {
      if (Array.isArray(val)) {
        messages.push(`${field}: ${val.join(' ')}`)
      } else if (typeof val === 'string') {
        messages.push(`${field}: ${val}`)
      }
    }
    if (messages.length > 0) return messages.join(' · ')
  }
  return fallback
}

async function request(endpoint, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!res.ok) {
      let errorDetail = `Request failed (${res.status})`
      try {
        const data = await res.json()
        errorDetail = formatApiError(data, errorDetail)
      } catch {
        // Ignore JSON parse error on non-JSON error responses
      }
      const err = new Error(errorDetail)
      err.status = res.status
      throw err
    }

    if (res.status === 204) return null
    return await res.json()
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out while contacting the Lazarus API.')
      timeoutErr.status = 408
      throw timeoutErr
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  // Service health & global counters
  getHealth: () => request('/health'),

  // Contracts
  getContracts: () => request('/contracts'),
  getContract: (id) => {
    const cleanId = sanitizeInput(id).toUpperCase()
    if (!isValidContractId(cleanId)) {
      return Promise.reject(
        new Error("Contract ID must be a valid 56-character Soroban address starting with 'C'.")
      )
    }
    return request(`/contracts/${encodeURIComponent(cleanId)}`)
  },
  createContract: (payload) => {
    const cleanId = sanitizeInput(payload?.contract_id).toUpperCase()
    if (!isValidContractId(cleanId)) {
      return Promise.reject(
        new Error("Contract ID must be a valid 56-character Soroban address starting with 'C'.")
      )
    }
    return request('/contracts', {
      method: 'POST',
      body: JSON.stringify({ ...payload, contract_id: cleanId }),
    })
  },
  updateContract: (id, payload, clientAddress = null) => {
    const cleanId = sanitizeInput(id).toUpperCase()
    if (!isValidContractId(cleanId)) {
      return Promise.reject(
        new Error("Contract ID must be a valid 56-character Soroban address starting with 'C'.")
      )
    }
    const headers = {}
    if (clientAddress) {
      headers['X-Client-Address'] = sanitizeInput(clientAddress).toUpperCase()
    }
    return request(`/contracts/${encodeURIComponent(cleanId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })
  },
  bootstrapContract: (id, payload = {}) => {
    const cleanId = sanitizeInput(id).toUpperCase()
    if (!isValidContractId(cleanId)) {
      return Promise.reject(
        new Error("Contract ID must be a valid 56-character Soroban address starting with 'C'.")
      )
    }
    return request(`/contracts/${encodeURIComponent(cleanId)}/bootstrap`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getContractKeys: (id) => {
    const cleanId = sanitizeInput(id).toUpperCase()
    if (!isValidContractId(cleanId)) {
      return Promise.reject(
        new Error("Contract ID must be a valid 56-character Soroban address starting with 'C'.")
      )
    }
    return request(`/contracts/${encodeURIComponent(cleanId)}/keys`)
  },

  // Diagnostics & Heatmap
  getHeatmap: (contractId = null, currentLedger = null) => {
    const params = new URLSearchParams()
    if (contractId) {
      const cleanId = sanitizeInput(contractId).toUpperCase()
      if (!isValidContractId(cleanId)) {
        return Promise.reject(
          new Error("Contract ID must be a valid 56-character Soroban address starting with 'C'.")
        )
      }
      params.append('contract_id', cleanId)
    }
    if (currentLedger) params.append('current_ledger', String(currentLedger))
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request(`/diagnostics/heatmap${qs}`)
  },
  getExpiringKeys: (currentLedger = null) => {
    const qs = currentLedger ? `?current_ledger=${encodeURIComponent(currentLedger)}` : ''
    return request(`/keys/expiring${qs}`)
  },

  // Keepers
  getKeepers: () => request('/keepers'),
  getKeeper: (address) => {
    const cleanAddr = sanitizeInput(address).toUpperCase()
    if (!isValidStellarAddress(cleanAddr)) {
      return Promise.reject(
        new Error("Keeper address must be a valid 56-character Stellar address starting with 'G' or 'C'.")
      )
    }
    return request(`/keepers/${encodeURIComponent(cleanAddr)}`)
  },
  createKeeper: (payload) => {
    const cleanAddr = sanitizeInput(payload?.keeper_address).toUpperCase()
    if (!isValidStellarAddress(cleanAddr)) {
      return Promise.reject(
        new Error("Keeper address must be a valid 56-character Stellar address starting with 'G' or 'C'.")
      )
    }
    return request('/keepers', {
      method: 'POST',
      body: JSON.stringify({ ...payload, keeper_address: cleanAddr }),
    })
  },

  // Attestations & Vouchers
  getVouchers: (keeperAddress = null, contractId = null) => {
    const params = new URLSearchParams()
    if (keeperAddress && isValidStellarAddress(keeperAddress)) {
      params.append('keeper_address', sanitizeInput(keeperAddress).toUpperCase())
    }
    if (contractId && isValidContractId(contractId)) {
      params.append('contract_id', sanitizeInput(contractId).toUpperCase())
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request(`/attestation/vouchers${qs}`)
  },
  requestVoucher: (payload) =>
    request('/attestation/voucher', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  redeemVouchers: (payload) =>
    request('/attestation/vouchers/redeem', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
