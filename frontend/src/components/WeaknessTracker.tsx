import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../App.css'
import './AIChat.css'
import './WeaknessTracker.css'

interface Weakness {
  id: number
  topic: string
  count: number
  last_updated: string
}

type SortOption = 'count-desc' | 'count-asc' | 'recent' | 'alphabetical'
type FilterOption = 'all' | 'high' | 'medium' | 'low'

export default function WeaknessTracker() {
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([])
  const [filteredWeaknesses, setFilteredWeaknesses] = useState<Weakness[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('count-desc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [selectedWeakness, setSelectedWeakness] = useState<number | null>(null)
  const [recommendations, setRecommendations] = useState<{weaknessId: number, content: string, topic: string} | null>(null)
  const [loadingRecommendations, setLoadingRecommendations] = useState<number | null>(null)

  useEffect(() => {
    fetchWeaknesses()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [weaknesses, sortBy, filterBy])

  const fetchWeaknesses = async () => {
    try {
      const response = await api.get('/weaknesses')
      setWeaknesses(response.data)
    } catch (error) {
      console.error('Failed to fetch weaknesses:', error)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...weaknesses]

    // Apply filter
    if (filterBy === 'high') {
      filtered = filtered.filter(w => w.count >= 5)
    } else if (filterBy === 'medium') {
      filtered = filtered.filter(w => w.count >= 3 && w.count < 5)
    } else if (filterBy === 'low') {
      filtered = filtered.filter(w => w.count < 3)
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'count-desc':
          return b.count - a.count
        case 'count-asc':
          return a.count - b.count
        case 'recent':
          return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
        case 'alphabetical':
          return a.topic.localeCompare(b.topic)
        default:
          return 0
      }
    })

    setFilteredWeaknesses(filtered)
  }

  const handleGetRecommendations = async (weaknessId: number) => {
    if (selectedWeakness === weaknessId && recommendations?.weaknessId === weaknessId) {
      setSelectedWeakness(null)
      setRecommendations(null)
      return
    }

    setSelectedWeakness(weaknessId)
    setLoadingRecommendations(weaknessId)
    
    try {
      const response = await api.get(`/weaknesses/${weaknessId}/recommendations`)
      setRecommendations({
        weaknessId,
        content: response.data.recommendations,
        topic: response.data.topic
      })
    } catch (error: any) {
      console.error('Failed to get recommendations:', error)
      alert(error.response?.data?.detail || 'Failed to get recommendations. Please try again.')
    } finally {
      setLoadingRecommendations(null)
    }
  }

  const handleDeleteWeakness = async (weaknessId: number) => {
    if (window.confirm('Mark this weakness as improved and remove it from the list?')) {
      try {
        await api.delete(`/weaknesses/${weaknessId}`)
        fetchWeaknesses()
        if (selectedWeakness === weaknessId) {
          setSelectedWeakness(null)
          setRecommendations(null)
        }
      } catch (error: any) {
        console.error('Failed to delete weakness:', error)
        alert(error.response?.data?.detail || 'Failed to remove weakness. Please try again.')
      }
    }
  }

  const getSeverityColor = (count: number) => {
    if (count >= 5) return '#ef4444' // red
    if (count >= 3) return '#f59e0b' // orange
    return '#eab308' // yellow
  }

  const getSeverityLabel = (count: number) => {
    if (count >= 5) return 'High Priority'
    if (count >= 3) return 'Medium Priority'
    return 'Low Priority'
  }

  const getSeverityProgress = (count: number) => {
    // Progress based on max count in weaknesses
    const maxCount = weaknesses.length > 0 ? Math.max(...weaknesses.map(w => w.count)) : 1
    return Math.min((count / maxCount) * 100, 100)
  }

  const getTotalWeaknesses = () => weaknesses.length
  const getHighPriorityCount = () => weaknesses.filter(w => w.count >= 5).length
  const getTotalMistakes = () => weaknesses.reduce((sum, w) => sum + w.count, 0)

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>Weakness Tracker</h1>

      {weaknesses.length > 0 && (
        <div className="card stats-card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>📊 Statistics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#667eea', marginBottom: '0.5rem' }}>
                {getTotalWeaknesses()}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Weak Areas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.5rem' }}>
                {getHighPriorityCount()}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>High Priority</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.5rem' }}>
                {getTotalMistakes()}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Total Mistakes</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Your Weak Areas</h2>
          {weaknesses.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                className="input filter-button"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', minWidth: '150px' }}
              >
                <option value="count-desc">Most Mistakes</option>
                <option value="count-asc">Least Mistakes</option>
                <option value="recent">Most Recent</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              <select
                className="input filter-button"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', minWidth: '120px' }}
              >
                <option value="all">All</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}
        </div>
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
              {filteredWeaknesses.map((weakness) => (
                <div key={weakness.id} className="fade-in">
                  <div
                    className="weakness-card"
                    style={{
                      padding: '1.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      border: `2px solid ${getSeverityColor(weakness.count)}`,
                      boxShadow: `0 4px 15px ${getSeverityColor(weakness.count)}40`,
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ margin: 0 }}>{weakness.topic}</h3>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: `${getSeverityColor(weakness.count)}40`,
                            color: getSeverityColor(weakness.count),
                            border: `1px solid ${getSeverityColor(weakness.count)}`
                          }}>
                            {getSeverityLabel(weakness.count)}
                          </span>
                        </div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                          {weakness.count} incorrect answer{weakness.count !== 1 ? 's' : ''}
                        </p>
                        <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${getSeverityProgress(weakness.count)}%`,
                              color: getSeverityColor(weakness.count)
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          className="severity-badge"
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
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleGetRecommendations(weakness.id)}
                        disabled={loadingRecommendations === weakness.id}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        {loadingRecommendations === weakness.id 
                          ? 'Loading...' 
                          : selectedWeakness === weakness.id && recommendations?.weaknessId === weakness.id
                          ? 'Hide Recommendations'
                          : '💡 Get AI Recommendations'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDeleteWeakness(weakness.id)}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        ✓ Mark as Improved
                      </button>
                    </div>
                  </div>
                  {selectedWeakness === weakness.id && recommendations?.weaknessId === weakness.id && (
                    <div className="recommendation-card" style={{
                      padding: '1.5rem',
                      marginTop: '0.5rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(102, 126, 234, 0.3)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#a78bfa' }}>💡 AI Study Recommendations for {recommendations.topic}</h3>
                      </div>
                      <div className="summary-content" style={{ color: '#e0e0e0', lineHeight: '1.6' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {recommendations.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
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

