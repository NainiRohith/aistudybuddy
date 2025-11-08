import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../services/api'
import '../App.css'

interface Course {
  id: number
  name: string
}

interface StudySession {
  id: number
  topic: string
  scheduled_date: string
  duration_minutes: number
  status: string
}

interface StudyPlan {
  id: number
  course_id: number
  start_date: string
  end_date: string
  sessions: StudySession[]
}

export default function StudyPlanner() {
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<number | null>(courseId ? parseInt(courseId) : null)
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([])
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [syllabusText, setSyllabusText] = useState('')
  const [showSyllabusInput, setShowSyllabusInput] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchCourses()
    fetchStudyPlans()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses')
      setCourses(response.data)
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    }
  }

  const fetchStudyPlans = async () => {
    try {
      const response = await api.get('/study-plans')
      setStudyPlans(response.data)
    } catch (error) {
      console.error('Failed to fetch study plans:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension && ['pdf', 'ppt', 'pptx'].includes(extension)) {
        setSelectedFile(file)
        setSyllabusText('') // Clear text input when file is selected
      } else {
        alert('Please select a PDF or PPT/PPTX file')
        e.target.value = ''
      }
    }
  }

  const handleImportSyllabus = async () => {
    if (!selectedCourse) {
      alert('Please select a course')
      return
    }
    
    if (!selectedFile && !syllabusText) {
      alert('Please upload a file or enter syllabus text')
      return
    }
    
    setUploading(true)
    
    try {
      const formData = new FormData()
      
      if (selectedFile) {
        formData.append('file', selectedFile)
      } else if (syllabusText) {
        formData.append('syllabus_text', syllabusText)
      }
      
      await api.post(`/courses/${selectedCourse}/import-syllabus`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setSyllabusText('')
      setSelectedFile(null)
      setShowSyllabusInput(false)
      // Reset file input
      const fileInput = document.getElementById('syllabus-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      alert('Syllabus imported successfully!')
    } catch (error: any) {
      console.error('Failed to import syllabus:', error)
      alert(error.response?.data?.detail || 'Failed to import syllabus. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleGeneratePlan = async () => {
    if (!selectedCourse) {
      alert('Please select a course')
      return
    }
    
    try {
      await api.post('/study-plans/generate', {
        course_id: selectedCourse,
        start_date: startDate
      })
      fetchStudyPlans()
      alert('Study plan generated successfully!')
    } catch (error) {
      console.error('Failed to generate plan:', error)
    }
  }

  const handleUpdateSession = async (planId: number, sessionId: number, newDate: string) => {
    try {
      await api.put(`/study-plans/${planId}/sessions/${sessionId}`, {
        new_date: newDate
      })
      fetchStudyPlans()
    } catch (error) {
      console.error('Failed to update session:', error)
    }
  }

  const currentPlan = studyPlans.find(p => p.course_id === selectedCourse)

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>Study Planner</h1>

      <div className="card">
        <h2>Select Course</h2>
        <select
          className="input"
          value={selectedCourse || ''}
          onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">Select a course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <>
          <div className="card">
            <h2>Import Syllabus</h2>
            <button
              className="btn btn-secondary"
              onClick={() => setShowSyllabusInput(!showSyllabusInput)}
              style={{ marginBottom: '1rem' }}
            >
              {showSyllabusInput ? 'Hide' : 'Import Syllabus'}
            </button>
            {showSyllabusInput && (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label">Upload Syllabus File (PDF, PPT, PPTX)</label>
                  <input
                    id="syllabus-file-input"
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={handleFileSelect}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#e0e0e0',
                      cursor: 'pointer'
                    }}
                  />
                  {selectedFile && (
                    <p style={{ marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
                
                <div style={{ marginBottom: '1rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                  OR
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label">Paste syllabus text here</label>
                  <textarea
                    className="input"
                    rows={10}
                    value={syllabusText}
                    onChange={(e) => {
                      setSyllabusText(e.target.value)
                      setSelectedFile(null) // Clear file when text is entered
                    }}
                    placeholder="Paste your course syllabus here. The system will extract topics and deadlines."
                  />
                </div>
                
                <button 
                  className="btn btn-primary" 
                  onClick={handleImportSyllabus}
                  disabled={uploading || (!selectedFile && !syllabusText)}
                  style={{ width: '100%' }}
                >
                  {uploading ? 'Importing...' : 'Import Syllabus'}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Generate Study Plan</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleGeneratePlan}>
                Generate Plan
              </button>
            </div>
          </div>

          {currentPlan && (
            <div className="card">
              <h2>Your Study Plan</h2>
              <p>
                <strong>Period:</strong> {format(new Date(currentPlan.start_date), 'MMM d, yyyy')} - {format(new Date(currentPlan.end_date), 'MMM d, yyyy')}
              </p>
              <div style={{ marginTop: '1.5rem' }}>
                {currentPlan.sessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      padding: '1rem',
                      marginBottom: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>{session.topic}</h3>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                        {format(new Date(session.scheduled_date), 'MMM d, yyyy')} • {session.duration_minutes} minutes
                      </p>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          background: session.status === 'completed' 
                            ? 'rgba(56, 239, 125, 0.2)' 
                            : 'rgba(102, 126, 234, 0.2)',
                          color: session.status === 'completed' ? '#38ef7d' : '#a78bfa',
                          border: `1px solid ${session.status === 'completed' ? 'rgba(56, 239, 125, 0.3)' : 'rgba(102, 126, 234, 0.3)'}`
                        }}
                      >
                        {session.status}
                      </span>
                    </div>
                    <div>
                      <input
                        type="date"
                        value={format(new Date(session.scheduled_date), 'yyyy-MM-dd')}
                        onChange={(e) => handleUpdateSession(currentPlan.id, session.id, e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

