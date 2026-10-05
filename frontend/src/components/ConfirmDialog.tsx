import React, { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Styled replacement for the browser's native confirm / prompt / alert pop-ups,
 * so every confirmation in the app uses the same modal look.
 *
 * Usage in a page:
 *   const { confirm, prompt, notify, dialog } = useDialog()
 *   if (!(await confirm('Delete this note?', { danger: true, confirmText: 'Delete' }))) return
 *   ...and render {dialog} once in the page's JSX.
 */

type Kind = 'confirm' | 'prompt' | 'alert'

interface DialogOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  placeholder?: string
}

interface DialogState extends DialogOptions {
  kind: Kind
  message: string
  resolve: (value: any) => void
}

export function useDialog() {
  const [state, setState] = useState<DialogState | null>(null)

  const open = useCallback((kind: Kind, message: string, opts: DialogOptions = {}) =>
    new Promise<any>((resolve) => setState({ kind, message, resolve, ...opts })), [])

  /** Resolves true when confirmed, false when cancelled. */
  const confirm = useCallback((message: string, opts?: DialogOptions) =>
    open('confirm', message, opts) as Promise<boolean>, [open])

  /** Resolves the entered text ('' if left empty) when confirmed, or null when cancelled. */
  const prompt = useCallback((message: string, opts?: DialogOptions) =>
    open('prompt', message, opts) as Promise<string | null>, [open])

  /** Shows a message with a single OK button. */
  const notify = useCallback((message: string, opts?: DialogOptions) =>
    open('alert', message, opts) as Promise<void>, [open])

  const close = (value: any) => {
    state?.resolve(value)
    setState(null)
  }

  const dialog = state ? <DialogModal state={state} onClose={close} /> : null
  return { confirm, prompt, notify, dialog }
}

const DialogModal: React.FC<{ state: DialogState; onClose: (value: any) => void }> = ({ state, onClose }) => {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)
  const cancelValue = state.kind === 'prompt' ? null : state.kind === 'confirm' ? false : undefined
  const okValue = () => (state.kind === 'prompt' ? text.trim() : state.kind === 'confirm' ? true : undefined)

  useEffect(() => {
    (state.kind === 'prompt' ? inputRef.current : okRef.current)?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(cancelValue) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const title = state.title || (state.kind === 'alert' ? 'Notice' : 'Please confirm')

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2 className="modal-title" id="dialog-title">{title}</h2>
          <button className="modal-close" aria-label="Close" onClick={() => onClose(cancelValue)}>✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onClose(okValue()) }}>
          <p style={{ marginBottom: '1.25rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {state.message}
          </p>
          {state.kind === 'prompt' && (
            <div className="form-group mb-4">
              <input ref={inputRef} type="text" value={text} maxLength={500}
                placeholder={state.placeholder || ''} aria-label={state.message}
                onChange={(e) => setText(e.target.value)} />
            </div>
          )}
          <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
            {state.kind !== 'alert' && (
              <button type="button" className="btn btn-secondary" data-testid="dialog-cancel" onClick={() => onClose(cancelValue)}>
                {state.cancelText || 'Cancel'}
              </button>
            )}
            <button ref={okRef} type="submit" data-testid="dialog-confirm"
              className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`}>
              {state.confirmText || (state.kind === 'alert' ? 'OK' : 'Confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
