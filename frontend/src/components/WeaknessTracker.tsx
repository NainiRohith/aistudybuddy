import { useState, useEffect } from 'react'
import api from '../services/api'
import '../App.css'

interface Weakness {
  id: number
  topic: string
  count: number
  last_updated: string
}

export default function WeaknessTracker() {
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([])

  useEffect(() => {
    fetchWeaknesses()
  }, [])

  const fetchWeaknesses = async () => {
    try {
      const response = await api.get('/weaknesses')
      setWeaknesses(response.data)
    } catch (error) {
      console.error('Failed to fetch weaknesses:', error)
    }
  }

  const getSeverityColor = (count: number) => {
    if (count >= 5) return '#ef4444' // red
    if (count >= 3) return '#f59e0b' // orange
    return '#eab308' // yellow
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>Weakness Tracker</h1>

      <div className="card">
        <h2>Your Weak Areas</h2>
        {weaknesses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
              🎉 Great job! No weak areas detected yet.
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Take some quizzes to identify areas that need more practice.
            </p>
            <a href="/quiz" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>
              Take a Quiz
            </a>
          </div>
        ) : (
          <>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1.5rem' }}>
              These topics have been identified as areas where you need more practice based on your quiz performance.
            </p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {weaknesses.map((weakness) => (
                <div
                  key={weakness.id}
                  style={{
                    padding: '1.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    border: `2px solid ${getSeverityColor(weakness.count)}`,
                    boxShadow: `0 4px 15px ${getSeverityColor(weakness.count)}40`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>{weakness.topic}</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                      {weakness.count} incorrect answer{weakness.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: getSeverityColor(weakness.count),
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {weakness.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(102, 126, 234, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <h3 style={{ marginBottom: '1rem' }}>💡 Study Recommendations</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>• Review resources for these topics</li>
                <li style={{ marginBottom: '0.5rem' }}>• Use the AI Assistant to clarify concepts</li>
                <li style={{ marginBottom: '0.5rem' }}>• Take more practice quizzes on these areas</li>
                <li>• Adjust your study plan to allocate more time to weak topics</li>
              </ul>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <a href="/resources" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  Find Resources
                </a>
                <a href="/ai-chat" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                  Ask AI Assistant
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

