import { useState, useEffect } from 'react'
import api from '../services/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../App.css'
import './TestTracker.css'

interface Test {
  id: number
  course_id: number
  name: string
  test_date: string
  test_type: string | null
  score: number | null
  max_score: number
  weight: number
  topics: string[] | null
  notes: string | null
  created_at: string
}

interface Course {
  id: number
  name: string
}

export default function TestTracker() {
  const [tests, setTests] = useState<Test[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState<number | null>(null)
  const [studyPlan, setStudyPlan] = useState<{testId: number, plan: string, daysUntil: number, testName: string, courseName: string} | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<number | null>(null)
  
  const [newTest, setNewTest] = useState({
    course_id: 0,
    name: '',
    test_date: '',
    test_type: '',
    score: null as number | null,
    max_score: 100,
    weight: 0,
    topics: [] as string[],
    notes: ''
  })

  useEffect(() => {
    fetchCourses()
    fetchTests()
  }, [selectedCourse, showUpcomingOnly])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses')
      setCourses(response.data)
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    }
  }

  const fetchTests = async () => {
    try {
      const url = selectedCourse 
        ? `/tests?course_id=${selectedCourse}&upcoming_only=${showUpcomingOnly}`
        : `/tests?upcoming_only=${showUpcomingOnly}`
      const response = await api.get(url)
      setTests(response.data)
    } catch (error) {
      console.error('Failed to fetch tests:', error)
    }
  }

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/tests', newTest)
      setShowAddForm(false)
      setNewTest({
        course_id: 0,
        name: '',
        test_date: '',
        test_type: '',
        score: null,
        max_score: 100,
        weight: 0,
        topics: [],
        notes: ''
      })
      await fetchTests()
    } catch (error: any) {
      console.error('Failed to create test:', error)
      alert(error.response?.data?.detail || 'Failed to create test. Please try again.')
    }
  }

  const handleUpdateTest = async (testId: number, updates: Partial<Test>) => {
    try {
      await api.put(`/tests/${testId}`, updates)
      setShowEditForm(null)
      await fetchTests()
    } catch (error: any) {
      console.error('Failed to update test:', error)
      alert(error.response?.data?.detail || 'Failed to update test. Please try again.')
    }
  }

  const handleDeleteTest = async (testId: number) => {
    if (!window.confirm('Are you sure you want to delete this test?')) {
      return
    }
    try {
      await api.delete(`/tests/${testId}`)
      await fetchTests()
      if (studyPlan?.testId === testId) {
        setStudyPlan(null)
      }
    } catch (error: any) {
      console.error('Failed to delete test:', error)
      alert(error.response?.data?.detail || 'Failed to delete test. Please try again.')
    }
  }

  const handleGetStudyPlan = async (testId: number) => {
    setLoadingPlan(testId)
    try {
      const response = await api.get(`/tests/${testId}/study-plan`)
      setStudyPlan({
        testId,
        plan: response.data.study_plan,
        daysUntil: response.data.days_until_test,
        testName: response.data.test_name,
        courseName: response.data.course_name
      })
    } catch (error: any) {
      console.error('Failed to get study plan:', error)
      alert(error.response?.data?.detail || 'Failed to generate study plan. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const calculateDaysUntil = (testDate: string): number => {
    const now = new Date()
    const test = new Date(testDate)
    const diffTime = test.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const calculateCountdownPercentage = (testDate: string): number => {
    const daysUntil = calculateDaysUntil(testDate)
    if (daysUntil <= 0) return 100
    if (daysUntil >= 30) return 0
    return ((30 - daysUntil) / 30) * 100
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getCountdownColor = (days: number): string => {
    if (days <= 0) return '#ff6b6b'
    if (days <= 3) return '#ff6b6b'
    if (days <= 7) return '#ffa500'
    if (days <= 14) return '#ffd700'
    return '#4caf50'
  }

  const upcomingTests = tests.filter(t => calculateDaysUntil(t.test_date) >= 0)
  const pastTests = tests.filter(t => calculateDaysUntil(t.test_date) < 0)

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>📝 Test Tracker</h1>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Tests & Exams</h2>
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Test'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="label">Filter by Course</label>
            <select
              className="input"
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showUpcomingOnly}
                onChange={(e) => setShowUpcomingOnly(e.target.checked)}
              />
              <span>Upcoming Only</span>
            </label>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddTest} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="label">Course *</label>
                <select
                  className="input"
                  value={newTest.course_id}
                  onChange={(e) => setNewTest({ ...newTest, course_id: parseInt(e.target.value) })}
                  required
                >
                  <option value="0">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Test Name *</label>
                <input
                  type="text"
                  className="input"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  placeholder="e.g., Midterm Exam"
                  required
                />
              </div>
              <div>
                <label className="label">Test Date *</label>
                <input
                  type="date"
                  className="input"
                  value={newTest.test_date}
                  onChange={(e) => setNewTest({ ...newTest, test_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Test Type</label>
                <select
                  className="input"
                  value={newTest.test_type}
                  onChange={(e) => setNewTest({ ...newTest, test_type: e.target.value })}
                >
                  <option value="">Select Type</option>
                  <option value="quiz">Quiz</option>
                  <option value="midterm">Midterm</option>
                  <option value="final">Final Exam</option>
                  <option value="assignment">Assignment</option>
                  <option value="project">Project</option>
                </select>
              </div>
              <div>
                <label className="label">Score (if completed)</label>
                <input
                  type="number"
                  className="input"
                  value={newTest.score || ''}
                  onChange={(e) => setNewTest({ ...newTest, score: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Leave empty if upcoming"
                />
              </div>
              <div>
                <label className="label">Max Score</label>
                <input
                  type="number"
                  className="input"
                  value={newTest.max_score}
                  onChange={(e) => setNewTest({ ...newTest, max_score: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Weight (%)</label>
                <input
                  type="number"
                  className="input"
                  value={newTest.weight}
                  onChange={(e) => setNewTest({ ...newTest, weight: parseFloat(e.target.value) })}
                  step="0.1"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Notes</label>
              <textarea
                className="input"
                value={newTest.notes}
                onChange={(e) => setNewTest({ ...newTest, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes about this test..."
              />
            </div>
            <button type="submit" className="btn btn-primary">Add Test</button>
          </form>
        )}

        {upcomingTests.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#667eea' }}>📅 Upcoming Tests</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {upcomingTests.map((test) => {
                const daysUntil = calculateDaysUntil(test.test_date)
                const percentage = calculateCountdownPercentage(test.test_date)
                const course = courses.find(c => c.id === test.course_id)
                
                return (
                  <div key={test.id} className="test-card">
                    <div className="test-card-header">
                      <div>
                        <h3>{test.name}</h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                          {course?.name || 'Unknown Course'} • {formatDate(test.test_date)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="test-countdown" style={{ color: getCountdownColor(daysUntil) }}>
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </span>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowEditForm(showEditForm === test.id ? null : test.id)}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDeleteTest(test.id)}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'rgba(255, 107, 107, 0.2)', borderColor: 'rgba(255, 107, 107, 0.5)', color: '#ff6b6b' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="countdown-bar-container">
                      <div 
                        className="countdown-bar"
                        style={{
                          width: `${Math.min(100, Math.max(0, percentage))}%`,
                          backgroundColor: getCountdownColor(daysUntil)
                        }}
                      />
                    </div>

                    {test.test_type && (
                      <span className="test-badge">{test.test_type}</span>
                    )}

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleGetStudyPlan(test.id)}
                        disabled={loadingPlan === test.id}
                        style={{ fontSize: '0.875rem' }}
                      >
                        {loadingPlan === test.id ? 'Generating...' : '📚 Get Study Plan'}
                      </button>
                    </div>

                    {showEditForm === test.id && (
                      <TestEditForm
                        test={test}
                        onSave={(updates) => handleUpdateTest(test.id, updates)}
                        onCancel={() => setShowEditForm(null)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pastTests.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>📜 Past Tests</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {pastTests.map((test) => {
                const course = courses.find(c => c.id === test.course_id)
                const percentage = test.score !== null && test.max_score > 0 
                  ? (test.score / test.max_score) * 100 
                  : null
                
                return (
                  <div key={test.id} className="test-card" style={{ opacity: 0.7 }}>
                    <div className="test-card-header">
                      <div>
                        <h3>{test.name}</h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                          {course?.name || 'Unknown Course'} • {formatDate(test.test_date)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {test.score !== null && (
                          <span className="test-score" style={{ 
                            color: percentage && percentage >= 70 ? '#4caf50' : percentage && percentage >= 50 ? '#ffa500' : '#ff6b6b'
                          }}>
                            {test.score}/{test.max_score} ({percentage?.toFixed(1)}%)
                          </span>
                        )}
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDeleteTest(test.id)}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'rgba(255, 107, 107, 0.2)', borderColor: 'rgba(255, 107, 107, 0.5)', color: '#ff6b6b' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {test.score !== null && percentage !== null && (
                      <div className="countdown-bar-container">
                        <div 
                          className="countdown-bar"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: percentage >= 70 ? '#4caf50' : percentage >= 50 ? '#ffa500' : '#ff6b6b'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tests.length === 0 && (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '2rem' }}>
            No tests found. Add your first test to get started!
          </p>
        )}
      </div>

      {studyPlan && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>📚 Study Plan for {studyPlan.testName}</h2>
            <button className="btn btn-secondary" onClick={() => setStudyPlan(null)}>Close</button>
          </div>
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '8px' }}>
            <p><strong>Course:</strong> {studyPlan.courseName}</p>
            <p><strong>Days Until Test:</strong> {studyPlan.daysUntil} days</p>
          </div>
          <div className="study-plan-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{studyPlan.plan}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

function TestEditForm({ test, onSave, onCancel }: { test: Test, onSave: (updates: Partial<Test>) => void, onCancel: () => void }) {
  const [updates, setUpdates] = useState({
    name: test.name,
    test_date: test.test_date.split('T')[0],
    test_type: test.test_type || '',
    score: test.score,
    max_score: test.max_score,
    weight: test.weight,
    notes: test.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(updates)
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label className="label">Name</label>
          <input
            type="text"
            className="input"
            value={updates.name}
            onChange={(e) => setUpdates({ ...updates, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={updates.test_date}
            onChange={(e) => setUpdates({ ...updates, test_date: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Score</label>
          <input
            type="number"
            className="input"
            value={updates.score || ''}
            onChange={(e) => setUpdates({ ...updates, score: e.target.value ? parseFloat(e.target.value) : null })}
          />
        </div>
        <div>
          <label className="label">Max Score</label>
          <input
            type="number"
            className="input"
            value={updates.max_score}
            onChange={(e) => setUpdates({ ...updates, max_score: parseFloat(e.target.value) })}
          />
        </div>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label className="label">Notes</label>
        <textarea
          className="input"
          value={updates.notes}
          onChange={(e) => setUpdates({ ...updates, notes: e.target.value })}
          rows={2}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Save</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ fontSize: '0.875rem' }}>Cancel</button>
      </div>
    </form>
  )
}

