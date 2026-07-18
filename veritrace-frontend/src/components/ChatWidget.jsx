import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Bot, CornerDownLeft, Sparkles } from 'lucide-react'
import { RAG_BOT_API } from '../config'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('veritrace_chat_history')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // Fallback
      }
    }
    return [
      {
        id: 'welcome',
        text: 'Hi! I am the VeriTrace Help Assistant, grounded in platform documentation. Ask me about fingerprinting, visual similarity matching thresholds, or request content verification checks and team alerts!',
        sender: 'bot',
        timestamp: new Date().toISOString(),
      },
    ]
  })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    sessionStorage.setItem('veritrace_chat_history', JSON.stringify(messages))
    if (!isOpen && messages.length > 1 && messages[messages.length - 1].sender === 'bot') {
      setHasUnread(true)
    }
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false)
      scrollToBottom()
    }
  }, [isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: `user-${Date.now()}`,
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch(`${RAG_BOT_API.replace(/\/$/, '')}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.text }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      const botMessage = {
        id: `bot-${Date.now()}`,
        text: data.response || "I couldn't process that request. Please try again.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err) {
      console.error('Chat bot error:', err)
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: 'Sorry, I am having trouble connecting to the helper service. Please verify the RAG Bot API deployment status.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Simple formatter for bold text, hashes, bullet points, and newlines
  const formatMessageText = (text) => {
    if (!text) return ''
    
    // Split by newlines
    const lines = text.split('\n')
    
    return lines.map((line, lineIndex) => {
      let content = line

      // Handle bullet points
      const isBullet = content.startsWith('- ') || content.startsWith('* ')
      if (isBullet) {
        content = content.substring(2)
      }

      // Format bold text (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g
      const parts = []
      let lastIndex = 0
      let match

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index))
        }
        parts.push(
          <strong key={match.index} className="font-bold text-[var(--text)]">
            {match[1]}
          </strong>
        )
        lastIndex = boldRegex.lastIndex
      }

      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex))
      }

      // Check if line looks like code or hash
      const isHash = /0x[a-fA-F0-9]{40,64}/.test(content) || /[a-fA-F0-9]{64}/.test(content)

      const renderedLine = (
        <span className={isHash ? 'font-mono text-xs select-all bg-[var(--bg-3)] px-1.5 py-0.5 rounded border border-[var(--border-2)] text-[#38b9ff]' : ''}>
          {parts.length > 0 ? parts : content}
        </span>
      )

      if (isBullet) {
        return (
          <li key={lineIndex} className="ml-4 list-disc mb-1.5 text-[var(--text-2)] leading-relaxed">
            {renderedLine}
          </li>
        )
      }

      return (
        <p key={lineIndex} className="mb-2 leading-relaxed text-[var(--text-2)]">
          {renderedLine}
        </p>
      )
    })
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-[360px] sm:w-[380px] h-[520px] max-h-[calc(100vh-120px)] rounded-2xl glass-card flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-4 border border-[var(--border-2)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-2)] bg-[var(--bg-2)]/60">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-lg bg-[#12AAFF]/10 flex items-center justify-center text-[#12AAFF] border border-[#12AAFF]/20 shadow-[0_0_12px_rgba(18,170,255,0.15)]">
                  <Bot size={16} />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00D395] border-2 border-[var(--bg)]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                    VeriTrace Assistant
                    <span className="flex items-center gap-0.5 text-[8px] font-semibold text-[#00D395] uppercase bg-[#00D395]/10 px-1 rounded">RAG</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-3)] flex items-center gap-1">
                    <Sparkles size={8} className="text-[#12AAFF]" />
                    <span>Gemini-Grounded Knowledge</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-3)] transition-colors active:scale-95"
              >
                <X size={15} />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar bg-[var(--bg)]/10">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user'
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2`}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-md bg-[#12AAFF]/10 border border-[#12AAFF]/20 flex items-center justify-center text-[#12AAFF] shrink-0 mt-0.5">
                        <Bot size={12} />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                        isUser
                          ? 'bg-gradient-to-br from-[#12AAFF] to-[#1B4ADD] text-white rounded-tr-none'
                          : msg.isError
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-tl-none'
                          : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-2)] rounded-tl-none'
                      }`}
                    >
                      {isUser ? (
                        <p className="leading-relaxed select-text">{msg.text}</p>
                      ) : (
                        <div className="select-text space-y-1">{formatMessageText(msg.text)}</div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Bouncing Loader */}
              {isLoading && (
                <div className="flex justify-start items-start gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#12AAFF]/10 border border-[#12AAFF]/20 flex items-center justify-center text-[#12AAFF] shrink-0">
                    <Bot size={12} />
                  </div>
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#12AAFF] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#12AAFF] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#12AAFF] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSend}
              className="px-3 py-3 border-t border-[var(--border-2)] bg-[var(--bg-2)]/60 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about thresholds, duplicates..."
                className="flex-1 bg-[var(--bg)] border border-[var(--border-2)] focus:border-[#12AAFF]/50 rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-4)] focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#12AAFF] to-[#1B4ADD] text-white flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none transition-all hover:brightness-110"
              >
                <Send size={12} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 active:scale-95 relative group border border-[#e2e8f0] ${
          isOpen
            ? 'bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]'
            : 'bg-white hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)] hover:scale-105'
        }`}
        aria-label="Toggle Help Chatbot"
      >
        {isOpen ? (
          <X size={22} className="text-gray-500 hover:text-gray-700" />
        ) : (
          <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Concentric circular rings around the mascot */}
            <circle cx="50" cy="50" r="38" stroke="#add6ff" strokeWidth="1.2" strokeOpacity="0.85" />
            <circle cx="50" cy="50" r="34" stroke="#add6ff" strokeWidth="1.2" strokeOpacity="0.45" />

            {/* Bear-like ears */}
            <circle cx="34" cy="27" r="6.5" fill="#add6ff" opacity="0.6" />
            <circle cx="66" cy="27" r="6.5" fill="#add6ff" opacity="0.6" />

            {/* Shoulders */}
            <path d="M32 55 C29 60 29 66 33 69" fill="none" stroke="#2b66ff" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M68 55 C71 60 71 66 67 69" fill="none" stroke="#2b66ff" strokeWidth="5.5" strokeLinecap="round" />

            {/* Shield Chestplate (VeriTrace Signature Logo) */}
            <path
              d="M50 52 L61 54.5 V64 C61 70 57 74 50 76 C43 74 39 70 39 64 V54.5 Z"
              fill="#2b66ff"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Checkmark inside chest shield */}
            <path d="M45.5 64.5 L48.5 67.5 L54.5 61.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Robot Head */}
            <rect x="29" y="26" width="42" height="26" rx="13" fill="#2b66ff" stroke="#ffffff" strokeWidth="1.2" />

            {/* Visor Area */}
            <rect x="35" y="31" width="30" height="13" rx="6.5" fill="#0c1424" stroke="#ffffff" strokeWidth="0.8" />

            {/* Glowing Eyes */}
            <rect x="40" y="34.5" width="8" height="6" rx="3" fill="#00e699" />
            <rect x="52" y="34.5" width="8" height="6" rx="3" fill="#00e699" />
            {/* Inner glowing dots */}
            <circle cx="44" cy="37.5" r="1" fill="#ffffff" />
            <circle cx="56" cy="37.5" r="1" fill="#ffffff" />

            {/* Smile Mouth */}
            <path d="M45 46 Q50 50 55 46" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
        
        {/* Unread indicator */}
        {!isOpen && hasUnread && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#00D395] border-2 border-white rounded-full animate-pulse" />
        )}
      </button>
    </div>
  )
}
