import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import '../App.css'

interface Course {
  id: number
  name: string
  code: string | null
}

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses')
      setCourses(response.data)
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/courses', {
        name: newCourseName,
        code: newCourseCode || null
      })
      setNewCourseName('')
      setNewCourseCode('')
      fetchCourses()
    } catch (error) {
      console.error('Failed to add course:', error)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>
      
      <div className="card">
        <h2>Add New Course</h2>
        <form onSubmit={handleAddCourse} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="label">Course Name</label>
            <input
              type="text"
              className="input"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              placeholder="e.g., Introduction to Computer Science"
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Course Code (optional)</label>
            <input
              type="text"
              className="input"
              value={newCourseCode}
              onChange={(e) => setNewCourseCode(e.target.value)}
              placeholder="e.g., CS101"
            />
          </div>
          <button type="submit" className="btn btn-primary">Add Course</button>
        </form>
      </div>

      <div className="card">
        <h2>Your Courses</h2>
        {courses.length === 0 ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No courses yet. Add your first course above!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/planner?courseId=${course.id}`}
                style={{
                  padding: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <h3 style={{ marginBottom: '0.5rem', color: '#ffffff' }}>{course.name}</h3>
                {course.code && <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>{course.code}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link to="/planner" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Create Study Plan
          </Link>
          <Link to="/resources" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Find Resources
          </Link>
          <Link to="/quiz" className="btn btn-success" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Take Quiz
          </Link>
          <Link to="/ai-chat" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            AI Assistant
          </Link>
        </div>
      </div>
    </div>
  )
}

