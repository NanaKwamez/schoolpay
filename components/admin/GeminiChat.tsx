'use client'

/** Floating Gemini AI chat FAB + panel for the admin dashboard */
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircle,
  X,
  Building2,
  ArrowUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED = [
  'How much have we collected this week?',
  'Which class owes the most money?',
  'How many students paid feeding today?',
  'Give me a summary for the PTA meeting',
]

export function GeminiChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, isOpen, scrollToBottom])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const send = async (text?: string) => {
    const userMessage = (text ?? input).trim()
    if (!userMessage || isLoading) return

    const priorHistory = messages.map(m => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: m.content,
    }))

    setInput('')
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date() },
    ])
    setIsLoading(true)

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: priorHistory }),
      })
      const data = (await res.json()) as { response?: string; error?: string; detail?: string }

      const assistantText =
        data.response ??
        data.error ??
        data.detail ??
        'Sorry, I could not respond.'

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: assistantText,
          timestamp: new Date(),
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connection error. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* ── Floating FAB ───────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'h-16 w-16 rounded-full mga-btn-primary flex items-center justify-center p-0',
          'border border-mga-gold/40 shadow-xl',
          'transition-all active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mga-cream'
        )}
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
      >
        <MessageCircle className="h-8 w-8" aria-hidden />
      </button>

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-24 right-6 z-50',
            'w-80 sm:w-96 max-h-[70vh]',
            'mga-card-elevated flex flex-col overflow-hidden'
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gemini-chat-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-mga-gold/15 shrink-0 bg-mga-cream-dark/50">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-5 w-5 text-mga-green-mid shrink-0" aria-hidden />
              <h2 id="gemini-chat-title" className="font-bold text-gray-900 text-sm truncate">
                Morning Glory AI
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl hover:bg-mga-green-pale text-gray-400 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    disabled={isLoading}
                    className={cn(
                      'text-left text-xs font-medium rounded-xl px-3 py-2',
                      'border-2 border-mga-green-mid text-mga-green-dark',
                      'hover:bg-mga-green-pale transition-colors',
                      'disabled:opacity-50'
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={`${msg.timestamp.getTime()}-${i}`}
                className={cn(
                  'rounded-2xl px-4 py-2 text-sm max-w-[80%] whitespace-pre-wrap break-words',
                  msg.role === 'user'
                    ? 'ml-auto bg-gradient-to-br from-mga-green-mid to-mga-green-light text-white border border-mga-gold/25 shadow-sm'
                    : 'mr-auto bg-mga-cream-dark text-gray-800 border border-mga-gold/10'
                )}
              >
                {msg.content}
              </div>
            ))}

            {isLoading && (
              <div className="mr-auto flex gap-1.5 py-2 px-1" aria-live="polite">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-mga-gold/15 px-3 py-3 shrink-0 bg-white">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder="Ask about fees, debt, feeding…"
                disabled={isLoading}
                className={cn(
                  'flex-1 min-h-[48px] rounded-xl border-2 border-mga-gold/20 px-3 text-sm',
                  'outline-none focus:border-mga-green-mid transition',
                  'disabled:opacity-50'
                )}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={isLoading || !input.trim()}
                className={cn(
                  'mga-btn-primary shrink-0 h-12 w-12 rounded-xl flex items-center justify-center p-0',
                  'disabled:opacity-40 disabled:pointer-events-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-gold/50 focus-visible:ring-offset-2'
                )}
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
