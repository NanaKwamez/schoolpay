'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function GeminiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m SchoolPay AI. Ask me anything about your school\'s finances.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'Sorry, I could not respond.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-3 py-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex items-start gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
          >
            <div className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'user' ? 'bg-morning-green-600' : 'bg-gray-200'
            )}>
              {msg.role === 'user'
                ? <User className="h-3.5 w-3.5 text-white" />
                : <Bot className="h-3.5 w-3.5 text-gray-600" />}
            </div>
            <div className={cn(
              'rounded-2xl px-3 py-2 max-w-[80%] text-sm',
              msg.role === 'user'
                ? 'bg-morning-green-600 text-white rounded-tr-sm'
                : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-gray-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
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
      <div className="border-t border-gray-100 pt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about fees, expenses, debt…"
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-morning-green-500 focus:border-morning-green-500 outline-none"
        />
        <Button onClick={send} loading={loading} size="sm" className="rounded-xl">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
