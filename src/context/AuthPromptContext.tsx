import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { captureAuthPrompted, captureAuthPromptDismissed } from '@/analytics/events'
import AuthPromptModal from '@/components/AuthPromptModal'

type AuthPromptContextValue = {
  isOpen: boolean
  actionLabel: string
  prompt: (action: string) => void
  dismiss: () => void
}

const AuthPromptContext = createContext<AuthPromptContextValue | null>(null)

export const AuthPromptProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [actionLabel, setActionLabel] = useState('')

  const prompt = useCallback((action: string) => {
    setActionLabel(action)
    setIsOpen(true)
    captureAuthPrompted({ actionAttempted: action })
  }, [])

  const dismiss = useCallback(() => {
    if (isOpen) {
      captureAuthPromptDismissed({ actionAttempted: actionLabel })
    }
    setIsOpen(false)
  }, [isOpen, actionLabel])

  const value = useMemo(
    () => ({ isOpen, actionLabel, prompt, dismiss }),
    [isOpen, actionLabel, prompt, dismiss],
  )

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      <AuthPromptModal isOpen={isOpen} actionLabel={actionLabel} onDismiss={dismiss} />
    </AuthPromptContext.Provider>
  )
}

export const useAuthPrompt = (): AuthPromptContextValue => {
  const context = useContext(AuthPromptContext)
  if (context === null) {
    throw new Error('useAuthPrompt must be used within an AuthPromptProvider')
  }
  return context
}
