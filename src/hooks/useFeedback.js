import { createContext, useContext } from 'react'

export const FeedbackContext = createContext(null)

/**
 * Global feedback API:
 *  - toast.success|error|warning|info(message, { title, duration })
 *  - confirm({ title, body, confirmLabel, cancelLabel, tone }) -> Promise<boolean>
 *  - result({ kind: 'success'|'error', title, body, txHash, actionLabel, onAction }) -> opens a result modal
 */
export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>')
  return ctx
}
