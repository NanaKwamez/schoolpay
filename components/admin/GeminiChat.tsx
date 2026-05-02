'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, X, Bot, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
  'Which students have been on credit for more than 3 days?',
]

interface GeminiChatProps {
  isOpen: boolean
  onClose: () => void
}

export function GeminiChat({ isOpen, onClose }: GeminiChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const send = async (text?: string) => {
    const userMessage = (text ?? input).trim()
    if (!userMessage || isLoading) return
    setInput('')

    const newMsg: Message = { role: 'user', content: userMessage, timestamp: new Date() }
    setMessages(prev => [...prev, newMsg])
    setIsLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: m.content,
      }))

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history }),
      })
      const data = await res.json() as { response?: string; error?: string }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response ?? data.error ?? 'Sorry, I could not respond.',
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={onClose} />

      {/* Panel */}
      <div className={cn(
        'relative z-10 flex flex-col bg-white shadow-2xl',
        'w-full rounded-t-3xl sm:rounded-2xl sm:w-[500px] sm:h-[600px]',
        'h-[85vh]'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-morning-green-100 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-morning-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Morning Glory AI Assistant</p>
              <p className="text-xs text-gray-400">Powered by Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 text-center font-medium mt-2">Ask me anything about SchoolPay</p>
              <div className="space-y-2">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="w-full text-left text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 hover:bg-morning-green-50 hover:border-morning-green-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn('flex items-end gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                msg.role === 'user' ? 'bg-morning-green-600' : 'bg-gray-200'
              )}>
                {msg.role === 'user'
                  ? <User className="h-3.5 w-3.5 text-white" />
                  : <Bot className="h-3.5 w-3.5 text-gray-600" />}
              </div>
              <div className="max-w-[80%]">
                <div className={cn(
                  'rounded-2xl px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-morning-green-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm border border-gray-200'
                )}>
                  {msg.content}
                </div>
                <p className={cn(
                  'text-xs text-gray-400 mt-0.5',
                  msg.role === 'user' ? 'text-right' : 'text-left'
                )}>
                  {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-gray-600" />
              </div>
              <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3 shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about fees, expenses, debt…"
              disabled={isLoading}
              className="flex-1 min-h-[48px] border-2 border-gray-200 rounded-xl px-4 text-sm focus:ring-0 focus:border-morning-green-500 outline-none transition disabled:opacity-50"
            />
            <Button
              onClick={() => send()}
              loading={isLoading}
              disabled={!input.trim()}
              size="md"
              variant="primary"
              className="rounded-xl min-w-[48px] h-12"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
