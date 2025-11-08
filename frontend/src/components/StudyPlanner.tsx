import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../services/api'
import '../App.css'
import './AIChat.css'
import './BuddyButton.css'
import './QuizModal.css'

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
  const [endDate, setEndDate] = useState(() => {
    const defaultEnd = new Date()
    defaultEnd.setDate(defaultEnd.getDate() + 56) // 8 weeks default
    return format(defaultEnd, 'yyyy-MM-dd')
  })
  const [syllabusText, setSyllabusText] = useState('')
  const [showSyllabusInput, setShowSyllabusInput] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [planExplanation, setPlanExplanation] = useState<{planId: number, explanation: string} | null>(null)
  const [loadingExplanation, setLoadingExplanation] = useState<number | null>(null)
  const [topicExplanations, setTopicExplanations] = useState<{sessionId: number, explanation: string, topic: string} | null>(null)
  const [loadingTopicExplanation, setLoadingTopicExplanation] = useState<number | null>(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizModalData, setQuizModalData] = useState<{courseId: number, topicsCount: number} | null>(null)
  const [generatingQuiz, setGeneratingQuiz] = useState(false)

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
    const files = e.target.files
    if (files && files.length > 0) {
      const validFiles: File[] = []
      const invalidFiles: string[] = []
      
      Array.from(files).forEach((file) => {
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (extension && ['pdf', 'ppt', 'pptx'].includes(extension)) {
          validFiles.push(file)
        } else {
          invalidFiles.push(file.name)
        }
      })
      
      if (invalidFiles.length > 0) {
        alert(`The following files were skipped (only PDF, PPT, PPTX are supported):\n${invalidFiles.join('\n')}`)
      }
      
      if (validFiles.length > 0) {
        setSelectedFiles(validFiles)
        setSyllabusText('') // Clear text input when files are selected
      } else {
        e.target.value = ''
      }
    }
  }

  const handleImportSyllabus = async () => {
    if (!selectedCourse) {
      alert('Please select a course')
      return
    }
    
    if (selectedFiles.length === 0 && !syllabusText) {
      alert('Please upload file(s) or enter syllabus text')
      return
    }
    
    setUploading(true)
    
    try {
      const formData = new FormData()
      
      if (selectedFiles.length > 0) {
        // Append all selected files
        selectedFiles.forEach((file) => {
          formData.append('files', file)
        })
      } else if (syllabusText) {
        formData.append('syllabus_text', syllabusText)
      }
      
      // Store file count before clearing
      const fileCount = selectedFiles.length
      
      const response = await api.post(`/courses/${selectedCourse}/import-syllabus`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setSyllabusText('')
      setSelectedFiles([])
      setShowSyllabusInput(false)
      // Reset file input
      const fileInput = document.getElementById('syllabus-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      const responseData = response.data
      const fileText = fileCount > 0 ? `${fileCount} file(s) ` : ''
      
      // Show quiz generation modal if topics were extracted
      if (responseData && responseData.has_topics && responseData.topics_count > 0) {
        setQuizModalData({
          courseId: selectedCourse,
          topicsCount: responseData.topics_count
        })
        setShowQuizModal(true)
      } else {
        alert(`${fileText}Imported successfully!`)
      }
    } catch (error: any) {
      console.error('Failed to import syllabus:', error)
      // Ensure error message is a string
      const errorMessage = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail))
        : 'Failed to import syllabus. Please try again.'
      alert(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleGeneratePlan = async () => {
    if (!selectedCourse) {
      alert('Please select a course')
      return
    }
    
    // Check if a plan already exists for this course
    const existingPlan = studyPlans.find(p => p.course_id === selectedCourse)
    if (existingPlan) {
      const shouldReplace = window.confirm(
        'A study plan already exists for this course. Do you want to delete the existing plan and create a new one?'
      )
      if (shouldReplace) {
        try {
          await api.delete(`/study-plans/${existingPlan.id}`)
        } catch (error) {
          console.error('Failed to delete existing plan:', error)
        }
      } else {
        return
      }
    }
    
    try {
      const response = await api.post('/study-plans/generate', {
        course_id: selectedCourse,
        start_date: startDate,
        end_date: endDate
      })
      await fetchStudyPlans()
      alert('Study plan generated successfully! Each topic from your syllabus has been scheduled as a study session.')
    } catch (error: any) {
      console.error('Failed to generate plan:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to generate study plan. Please try again.'
      if (errorMessage.includes('No topics found')) {
        alert('No topics found for this course. Please import a syllabus first (PDF/PPT) to extract topics.')
      } else if (errorMessage.includes('Invalid date format')) {
        alert('Invalid date format. Please select valid start and end dates.')
      } else if (errorMessage.includes('End date must be after start date')) {
        alert('End date must be after start date. Please select a valid end date.')
      } else {
        alert(errorMessage)
      }
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

  const handleSummarize = async () => {
    if (!selectedCourse) {
      alert('Please select a course')
      return
    }

    setLoadingSummary(true)
    try {
      const response = await api.get(`/courses/${selectedCourse}/summarize`)
      setSummary(response.data.summary)
      setShowSummary(true)
    } catch (error: any) {
      console.error('Failed to generate summary:', error)
      alert(error.response?.data?.detail || 'Failed to generate summary. Please make sure you have uploaded a syllabus first.')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleExplainPlan = async (planId: number) => {
    setLoadingExplanation(planId)
    try {
      const response = await api.get(`/study-plans/${planId}/explain`)
      setPlanExplanation({ planId, explanation: response.data.explanation })
    } catch (error: any) {
      console.error('Failed to explain plan:', error)
      alert(error.response?.data?.detail || 'Failed to generate plan explanation. Please try again.')
    } finally {
      setLoadingExplanation(null)
    }
  }

  const handleExplainTopic = async (sessionId: number, topic: string) => {
    setLoadingTopicExplanation(sessionId)
    try {
      const response = await api.get(`/study-sessions/${sessionId}/explain`)
      setTopicExplanations({ sessionId, explanation: response.data.explanation, topic: response.data.topic })
    } catch (error: any) {
      console.error('Failed to explain topic:', error)
      alert(error.response?.data?.detail || 'Failed to generate topic explanation. Please try again.')
    } finally {
      setLoadingTopicExplanation(null)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!quizModalData) return
    
    setGeneratingQuiz(true)
    try {
      await api.post(`/courses/${quizModalData.courseId}/generate-quiz`)
      setShowQuizModal(false)
      setQuizModalData(null)
      alert('Quiz generated successfully! Check the Quiz section to take it.')
    } catch (error: any) {
      console.error('Failed to generate quiz:', error)
      alert(error.response?.data?.detail || 'Failed to generate quiz. Please try again.')
    } finally {
      setGeneratingQuiz(false)
    }
  }

  const currentPlan = studyPlans.find(p => p.course_id === selectedCourse)

  return (
    <>
      {showQuizModal && quizModalData && (
        <div className="quiz-modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quiz-modal-particles">
              <div className="quiz-modal-particle" />
              <div className="quiz-modal-particle" />
              <div className="quiz-modal-particle" />
              <div className="quiz-modal-particle" />
            </div>
            <button className="quiz-modal-close" onClick={() => setShowQuizModal(false)}>
              ×
            </button>
            <div className="quiz-modal-header">
              <div className="quiz-modal-icon">📝</div>
              <h2 className="quiz-modal-title">Syllabus Imported!</h2>
              <p className="quiz-modal-subtitle">
                We found {quizModalData.topicsCount} topic{quizModalData.topicsCount !== 1 ? 's' : ''} in your syllabus.
                Generate a quiz to test your knowledge?
              </p>
            </div>
            <div className="quiz-modal-content">
              <div className="quiz-modal-stats">
                <div className="quiz-modal-stat">
                  <div className="quiz-modal-stat-number">{quizModalData.topicsCount}</div>
                  <div className="quiz-modal-stat-label">Topics Found</div>
                </div>
                <div className="quiz-modal-stat">
                  <div className="quiz-modal-stat-number">10</div>
                  <div className="quiz-modal-stat-label">Questions</div>
                </div>
              </div>
              <button
                className="quiz-modal-button"
                onClick={handleGenerateQuiz}
                disabled={generatingQuiz}
              >
                {generatingQuiz ? 'Generating Quiz...' : '✨ Generate Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="container">
        <h1 style={{ marginBottom: '2rem' }}>AI Study Buddy</h1>

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
                  <label className="label">Upload Syllabus Files (PDF, PPT, PPTX) - Multiple files supported</label>
                  <input
                    id="syllabus-file-input"
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    multiple
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
                  {selectedFiles.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        Selected {selectedFiles.length} file(s):
                      </p>
                      <ul style={{ 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        fontSize: '0.9rem',
                        marginLeft: '1.5rem',
                        listStyleType: 'disc'
                      }}>
                        {selectedFiles.map((file, index) => (
                          <li key={index}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
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
                      setSelectedFiles([]) // Clear files when text is entered
                    }}
                    placeholder="Paste your course syllabus here. The system will extract topics and deadlines."
                  />
                </div>
                
                <button 
                  className="btn btn-primary" 
                  onClick={handleImportSyllabus}
                  disabled={uploading || (selectedFiles.length === 0 && !syllabusText)}
                  style={{ width: '100%' }}
                >
                  {uploading ? 'Importing...' : `Import Syllabus${selectedFiles.length > 0 ? ` (${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''})` : ''}`}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Study Plan Actions</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    // Auto-update end date if it becomes before start date
                    if (e.target.value && endDate && e.target.value >= endDate) {
                      const newEnd = new Date(e.target.value)
                      newEnd.setDate(newEnd.getDate() + 56) // 8 weeks default
                      setEndDate(format(newEnd, 'yyyy-MM-dd'))
                    }
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="label">End Date</label>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleGeneratePlan}>
                  Generate Plan
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleSummarize}
                  disabled={loadingSummary}
                  style={{
                    background: 'rgba(102, 126, 234, 0.2)',
                    border: '1px solid rgba(102, 126, 234, 0.5)',
                    color: '#a78bfa'
                  }}
                >
                  {loadingSummary ? 'Summarizing...' : '📄 Summarize Syllabus'}
                </button>
              </div>
            </div>
          </div>

          {showSummary && summary && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>📄 Syllabus Summary</h2>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowSummary(false)
                    setSummary(null)
                  }}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  Close
                </button>
              </div>
              <div
                style={{
                  padding: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#e0e0e0',
                  lineHeight: '1.6'
                }}
                className="summary-content"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {currentPlan && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>Your Study Plan</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    className={`buddy-button animated ${loadingExplanation === currentPlan.id ? 'loading' : ''}`}
                    onClick={() => handleExplainPlan(currentPlan.id)}
                    disabled={loadingExplanation === currentPlan.id}
                    title="Get AI-generated study schedule and plan for these topics"
                  >
                    <span className="buddy-icon">🤖</span>
                    <span>{loadingExplanation === currentPlan.id ? 'Explaining...' : 'Buddy'}</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this study plan? This action cannot be undone.')) {
                        try {
                          await api.delete(`/study-plans/${currentPlan.id}`)
                          fetchStudyPlans()
                          setPlanExplanation(null)
                          alert('Study plan deleted successfully!')
                        } catch (error: any) {
                          console.error('Failed to delete study plan:', error)
                          alert(error.response?.data?.detail || 'Failed to delete study plan. Please try again.')
                        }
                      }
                    }}
                    style={{
                      background: 'rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.5)',
                      color: '#ff6b6b'
                    }}
                  >
                    Delete Plan
                  </button>
                </div>
              </div>
              
              {planExplanation && planExplanation.planId === currentPlan.id && (
                <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '12px', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#a78bfa' }}>📅 Study Schedule & Plan</h3>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setPlanExplanation(null)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Close
                    </button>
                  </div>
                  <div
                    style={{
                      color: '#e0e0e0',
                      lineHeight: '1.6',
                      maxHeight: '600px',
                      overflowY: 'auto',
                      paddingRight: '0.5rem'
                    }}
                    className="summary-content"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {planExplanation.explanation}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              <p>
                <strong>Period:</strong> {format(new Date(currentPlan.start_date), 'MMM d, yyyy')} - {format(new Date(currentPlan.end_date), 'MMM d, yyyy')}
              </p>
              <div style={{ marginTop: '1.5rem' }}>
                {currentPlan.sessions.map((session) => (
                  <div key={session.id}>
                    <div
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
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
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
                            border: `1px solid ${session.status === 'completed' ? 'rgba(56, 239, 125, 0.3)' : 'rgba(102, 126, 234, 0.3)'}`,
                            display: 'inline-block',
                            marginTop: '0.5rem'
                          }}
                        >
                          {session.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className={`buddy-button animated ${loadingTopicExplanation === session.id ? 'loading' : ''}`}
                          onClick={() => handleExplainTopic(session.id, session.topic)}
                          disabled={loadingTopicExplanation === session.id}
                          title="Get AI explanation with examples for this topic"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem'
                          }}
                        >
                          <span className="buddy-icon">💡</span>
                          <span>{loadingTopicExplanation === session.id ? 'Explaining...' : 'Explain'}</span>
                        </button>
                        <input
                          type="date"
                          value={format(new Date(session.scheduled_date), 'yyyy-MM-dd')}
                          onChange={(e) => handleUpdateSession(currentPlan.id, session.id, e.target.value)}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#e0e0e0',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>
                    </div>
                    {topicExplanations && topicExplanations.sessionId === session.id && (
                      <div style={{
                        marginBottom: '1.5rem',
                        padding: '1.5rem',
                        background: 'rgba(102, 126, 234, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(102, 126, 234, 0.3)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ color: '#a78bfa' }}>💡 {topicExplanations.topic} - Explanation</h3>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setTopicExplanations(null)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                          >
                            Close
                          </button>
                        </div>
                        <div
                          style={{
                            color: '#e0e0e0',
                            lineHeight: '1.6',
                            maxHeight: '600px',
                            overflowY: 'auto',
                            paddingRight: '0.5rem'
                          }}
                          className="summary-content"
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {topicExplanations.explanation}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </>
  )
}

