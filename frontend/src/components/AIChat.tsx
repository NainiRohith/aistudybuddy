import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import '../App.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your AI study assistant. How can I help you today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await api.post('/ai/chat', { message: input })
      const assistantMessage: Message = { role: 'assistant', content: response.data.response }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to get AI response:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>AI Study Assistant</h1>

      <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', padding: '1rem' }}>
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: message.role === 'user' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: message.role === 'assistant' ? 'blur(10px)' : 'none',
                  color: message.role === 'user' ? 'white' : '#e0e0e0',
                  border: message.role === 'assistant' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  boxShadow: message.role === 'user' 
                    ? '0 4px 15px rgba(102, 126, 234, 0.4)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(255, 255, 255, 0.05)', 
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e0e0e0'
              }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your courses..."
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="card">
        <h3>💡 Example Questions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {[
            'Explain binary search algorithm',
            'What is the difference between stack and queue?',
            'Help me understand recursion',
            'How do I prepare for my upcoming exam?'
          ].map((example, idx) => (
            <button
              key={idx}
              className="btn btn-secondary"
              onClick={() => setInput(example)}
              style={{ textAlign: 'left', fontSize: '0.9rem' }}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

