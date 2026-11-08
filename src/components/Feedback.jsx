import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeedbackContext } from '../hooks/useFeedback'

const TONE = {
  success: { dot: 'bg-emerald', text: 'text-emerald', label: 'Success' },
  error: { dot: 'bg-red', text: 'text-red', label: 'Error' },
  warning: { dot: 'bg-amber', text: 'text-amber', label: 'Warning' },
  info: { dot: 'bg-blue', text: 'text-blue', label: 'Notice' },
}

const EXPLORER_TX = 'https://stellar.expert/explorer/testnet/tx/'

function Toast({ toast, onDismiss }) {
  const tone = TONE[toast.kind] || TONE.info
  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className="toast pointer-events-auto flex items-start gap-3 rounded-3xl border border-line bg-bg p-4 pr-3"
    >
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{toast.title || tone.label}</p>
        {toast.message && (
          <p className="mt-0.5 break-words text-sm text-muted">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-xs text-muted hover:bg-soft hover:text-fg"
      >
        ✕
      </button>
    </div>
  )
}

function ResultMark({ kind }) {
  const ok = kind === 'success'
  return (
    <span
      className={`grid size-16 place-items-center rounded-full ${ok ? 'bg-emerald' : 'bg-red'} text-white`}
      aria-hidden="true"
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {ok ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6 6 18" />}
      </svg>
    </span>
  )
}

function Modal({ children, onClose, labelledBy }) {
  const ref = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    const node = ref.current
    node?.querySelector('button, [href], input')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && node) {
        const f = node.querySelectorAll('button:not(:disabled), [href], input, select')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="scrim absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="modal relative w-full max-w-md rounded-t-[2rem] border border-line bg-bg p-8 sm:rounded-[2rem]"
      >
        {children}
      </div>
    </div>
  )
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const idRef = useRef(0)
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (kind, message, opts = {}) => {
      const id = ++idRef.current
      setToasts((t) => [...t.slice(-3), { id, kind, message, title: opts.title }])
      const duration = opts.duration ?? (kind === 'error' ? 8000 : 5000)
      if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss],
  )

  const toast = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      warning: (m, o) => push('warning', m, o),
      info: (m, o) => push('info', m, o),
      dismiss,
    }),
    [push, dismiss],
  )

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setDialog({ type: 'confirm', ...opts, resolve })
      }),
    [],
  )

  const result = useCallback((opts) => setDialog({ type: 'result', ...opts }), [])

  const closeDialog = useCallback((answer = false) => {
    setDialog((d) => {
      if (d?.type === 'confirm') d.resolve(answer)
      return null
    })
  }, [])

  const dismissDialog = useCallback(() => closeDialog(false), [closeDialog])

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  const value = useMemo(() => ({ toast, confirm, result }), [toast, confirm, result])

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[70] mx-auto flex w-full max-w-md flex-col gap-2 px-4 sm:inset-x-auto sm:right-6 sm:top-20 sm:mx-0 sm:px-0"
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>

      {dialog?.type === 'confirm' && (
        <Modal onClose={dismissDialog} labelledBy="dlg-title">
          <h2 id="dlg-title" className="text-2xl font-bold tracking-tight">
            {dialog.title}
          </h2>
          {dialog.body && <p className="mt-3 leading-relaxed text-muted">{dialog.body}</p>}
          {dialog.details && (
            <dl className="mt-5 divide-y divide-line border-y border-line text-sm">
              {dialog.details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="break-all text-right font-mono font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-outline" onClick={() => closeDialog(false)}>
              {dialog.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              className={`btn ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => closeDialog(true)}
            >
              {dialog.confirmLabel || 'Confirm'}
            </button>
          </div>
        </Modal>
      )}

      {dialog?.type === 'result' && (
        <Modal onClose={dismissDialog} labelledBy="dlg-title">
          <div className="flex flex-col items-center text-center">
            <ResultMark kind={dialog.kind} />
            <h2 id="dlg-title" className="mt-6 text-2xl font-bold tracking-tight">
              {dialog.title}
            </h2>
            {dialog.body && (
              <p className="mt-3 break-words leading-relaxed text-muted">{dialog.body}</p>
            )}
            {dialog.txHash && (
              <a
                className="link mt-4 break-all font-mono text-sm"
                href={`${EXPLORER_TX}${dialog.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction ↗
              </a>
            )}
            <div className="mt-8 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button type="button" className="btn btn-outline" onClick={dismissDialog}>
                Close
              </button>
              {dialog.actionLabel && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const fn = dialog.onAction
                    setDialog(null)
                    fn?.()
                  }}
                >
                  {dialog.actionLabel}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </FeedbackContext.Provider>
  )
}
