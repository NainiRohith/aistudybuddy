import { useState, useEffect } from 'react'
import api from '../services/api'
import '../App.css'

interface Quiz {
  id: number
  title: string
  questions: Array<{
    question: string
    options: string[]
    correct_answer: string
    topic?: string
  }>
}

export default function Quiz() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    questions: [{ question: '', options: ['', '', '', ''], correct_answer: '', topic: '' }]
  })
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const fetchQuizzes = async () => {
    try {
      // Try to fetch quizzes from the API
      const response = await api.get('/quizzes')
      if (response.data && response.data.length > 0) {
        // Check if we have a quiz with 10 questions
        const quizzes = response.data
        const quizWith10Questions = quizzes.find((q: Quiz) => q.questions.length === 10)
        
        if (!quizWith10Questions) {
          // No quiz with 10 questions exists, create one
          const sampleQuiz = {
            title: 'Sample Quiz - Data Structures & Algorithms',
            questions: [
              {
                question: 'What is the time complexity of binary search?',
                options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
                correct_answer: 'O(log n)',
                topic: 'Algorithms'
              },
              {
                question: 'Which data structure follows LIFO principle?',
                options: ['Queue', 'Stack', 'Array', 'Linked List'],
                correct_answer: 'Stack',
                topic: 'Data Structures'
              },
              {
                question: 'What is the time complexity of bubble sort in the worst case?',
                options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
                correct_answer: 'O(n²)',
                topic: 'Algorithms'
              },
              {
                question: 'Which data structure is best for implementing a priority queue?',
                options: ['Array', 'Linked List', 'Heap', 'Stack'],
                correct_answer: 'Heap',
                topic: 'Data Structures'
              },
              {
                question: 'What does DFS stand for in graph algorithms?',
                options: ['Depth First Search', 'Data First Search', 'Dynamic First Search', 'Directed First Search'],
                correct_answer: 'Depth First Search',
                topic: 'Algorithms'
              },
              {
                question: 'What is the time complexity of accessing an element in an array by index?',
                options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
                correct_answer: 'O(1)',
                topic: 'Data Structures'
              },
              {
                question: 'Which sorting algorithm has the best average time complexity?',
                options: ['Bubble Sort', 'Insertion Sort', 'Quick Sort', 'Selection Sort'],
                correct_answer: 'Quick Sort',
                topic: 'Algorithms'
              },
              {
                question: 'What is a binary tree where each node has at most two children called?',
                options: ['Complete Binary Tree', 'Full Binary Tree', 'Balanced Binary Tree', 'Binary Search Tree'],
                correct_answer: 'Binary Search Tree',
                topic: 'Data Structures'
              },
              {
                question: 'What is the space complexity of merge sort?',
                options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
                correct_answer: 'O(n)',
                topic: 'Algorithms'
              },
              {
                question: 'Which data structure is used to implement a hash table?',
                options: ['Array', 'Linked List', 'Tree', 'Graph'],
                correct_answer: 'Array',
                topic: 'Data Structures'
              }
            ]
          }
          const createdQuiz = await api.post('/quizzes', sampleQuiz)
          // Fetch all quizzes again and prioritize the 10-question one
          const updatedResponse = await api.get('/quizzes')
          const updatedQuizzes = updatedResponse.data
          // Sort: quizzes with 10 questions first
          updatedQuizzes.sort((a: Quiz, b: Quiz) => {
            if (a.questions.length === 10 && b.questions.length !== 10) return -1
            if (a.questions.length !== 10 && b.questions.length === 10) return 1
            return 0
          })
          setQuizzes(updatedQuizzes)
        } else {
          // Sort: quizzes with 10 questions first
          quizzes.sort((a: Quiz, b: Quiz) => {
            if (a.questions.length === 10 && b.questions.length !== 10) return -1
            if (a.questions.length !== 10 && b.questions.length === 10) return 1
            return 0
          })
          setQuizzes(quizzes)
        }
      } else {
        // If no quizzes exist, create a sample quiz in the database
        const sampleQuiz = {
          title: 'Sample Quiz - Data Structures & Algorithms',
          questions: [
            {
              question: 'What is the time complexity of binary search?',
              options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
              correct_answer: 'O(log n)',
              topic: 'Algorithms'
            },
            {
              question: 'Which data structure follows LIFO principle?',
              options: ['Queue', 'Stack', 'Array', 'Linked List'],
              correct_answer: 'Stack',
              topic: 'Data Structures'
            },
            {
              question: 'What is the time complexity of bubble sort in the worst case?',
              options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
              correct_answer: 'O(n²)',
              topic: 'Algorithms'
            },
            {
              question: 'Which data structure is best for implementing a priority queue?',
              options: ['Array', 'Linked List', 'Heap', 'Stack'],
              correct_answer: 'Heap',
              topic: 'Data Structures'
            },
            {
              question: 'What does DFS stand for in graph algorithms?',
              options: ['Depth First Search', 'Data First Search', 'Dynamic First Search', 'Directed First Search'],
              correct_answer: 'Depth First Search',
              topic: 'Algorithms'
            },
            {
              question: 'What is the time complexity of accessing an element in an array by index?',
              options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
              correct_answer: 'O(1)',
              topic: 'Data Structures'
            },
            {
              question: 'Which sorting algorithm has the best average time complexity?',
              options: ['Bubble Sort', 'Insertion Sort', 'Quick Sort', 'Selection Sort'],
              correct_answer: 'Quick Sort',
              topic: 'Algorithms'
            },
            {
              question: 'What is a binary tree where each node has at most two children called?',
              options: ['Complete Binary Tree', 'Full Binary Tree', 'Balanced Binary Tree', 'Binary Search Tree'],
              correct_answer: 'Binary Search Tree',
              topic: 'Data Structures'
            },
            {
              question: 'What is the space complexity of merge sort?',
              options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
              correct_answer: 'O(n)',
              topic: 'Algorithms'
            },
            {
              question: 'Which data structure is used to implement a hash table?',
              options: ['Array', 'Linked List', 'Tree', 'Graph'],
              correct_answer: 'Array',
              topic: 'Data Structures'
            }
          ]
        }
        
        try {
          const createdQuiz = await api.post('/quizzes', sampleQuiz)
          // Fetch all quizzes again and sort by question count
          const updatedResponse = await api.get('/quizzes')
          const updatedQuizzes = updatedResponse.data
          // Sort: quizzes with 10 questions first
          updatedQuizzes.sort((a: Quiz, b: Quiz) => {
            if (a.questions.length === 10 && b.questions.length !== 10) return -1
            if (a.questions.length !== 10 && b.questions.length === 10) return 1
            return 0
          })
          setQuizzes(updatedQuizzes)
        } catch (createError) {
          console.error('Failed to create sample quiz:', createError)
          // Fallback: use a local sample quiz (won't be submittable)
          const localQuiz: Quiz = {
            id: 0,
            title: 'Sample Quiz - Data Structures & Algorithms',
            questions: [
              {
                question: 'What is the time complexity of binary search?',
                options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
                correct_answer: 'O(log n)',
                topic: 'Algorithms'
              },
              {
                question: 'Which data structure follows LIFO principle?',
                options: ['Queue', 'Stack', 'Array', 'Linked List'],
                correct_answer: 'Stack',
                topic: 'Data Structures'
              },
              {
                question: 'What is the time complexity of bubble sort in the worst case?',
                options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
                correct_answer: 'O(n²)',
                topic: 'Algorithms'
              },
              {
                question: 'Which data structure is best for implementing a priority queue?',
                options: ['Array', 'Linked List', 'Heap', 'Stack'],
                correct_answer: 'Heap',
                topic: 'Data Structures'
              },
              {
                question: 'What does DFS stand for in graph algorithms?',
                options: ['Depth First Search', 'Data First Search', 'Dynamic First Search', 'Directed First Search'],
                correct_answer: 'Depth First Search',
                topic: 'Algorithms'
              },
              {
                question: 'What is the time complexity of accessing an element in an array by index?',
                options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
                correct_answer: 'O(1)',
                topic: 'Data Structures'
              },
              {
                question: 'Which sorting algorithm has the best average time complexity?',
                options: ['Bubble Sort', 'Insertion Sort', 'Quick Sort', 'Selection Sort'],
                correct_answer: 'Quick Sort',
                topic: 'Algorithms'
              },
              {
                question: 'What is a binary tree where each node has at most two children called?',
                options: ['Complete Binary Tree', 'Full Binary Tree', 'Balanced Binary Tree', 'Binary Search Tree'],
                correct_answer: 'Binary Search Tree',
                topic: 'Data Structures'
              },
              {
                question: 'What is the space complexity of merge sort?',
                options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
                correct_answer: 'O(n)',
                topic: 'Algorithms'
              },
              {
                question: 'Which data structure is used to implement a hash table?',
                options: ['Array', 'Linked List', 'Tree', 'Graph'],
                correct_answer: 'Array',
                topic: 'Data Structures'
              }
            ]
          }
          setQuizzes([localQuiz])
        }
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
      // On error, try to create a sample quiz
      const sampleQuiz = {
        title: 'Sample Quiz - Data Structures & Algorithms',
        questions: [
          {
            question: 'What is the time complexity of binary search?',
            options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
            correct_answer: 'O(log n)',
            topic: 'Algorithms'
          },
          {
            question: 'Which data structure follows LIFO principle?',
            options: ['Queue', 'Stack', 'Array', 'Linked List'],
            correct_answer: 'Stack',
            topic: 'Data Structures'
          },
          {
            question: 'What is the time complexity of bubble sort in the worst case?',
            options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
            correct_answer: 'O(n²)',
            topic: 'Algorithms'
          },
          {
            question: 'Which data structure is best for implementing a priority queue?',
            options: ['Array', 'Linked List', 'Heap', 'Stack'],
            correct_answer: 'Heap',
            topic: 'Data Structures'
          },
          {
            question: 'What does DFS stand for in graph algorithms?',
            options: ['Depth First Search', 'Data First Search', 'Dynamic First Search', 'Directed First Search'],
            correct_answer: 'Depth First Search',
            topic: 'Algorithms'
          },
          {
            question: 'What is the time complexity of accessing an element in an array by index?',
            options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
            correct_answer: 'O(1)',
            topic: 'Data Structures'
          },
          {
            question: 'Which sorting algorithm has the best average time complexity?',
            options: ['Bubble Sort', 'Insertion Sort', 'Quick Sort', 'Selection Sort'],
            correct_answer: 'Quick Sort',
            topic: 'Algorithms'
          },
          {
            question: 'What is a binary tree where each node has at most two children called?',
            options: ['Complete Binary Tree', 'Full Binary Tree', 'Balanced Binary Tree', 'Binary Search Tree'],
            correct_answer: 'Binary Search Tree',
            topic: 'Data Structures'
          },
          {
            question: 'What is the space complexity of merge sort?',
            options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
            correct_answer: 'O(n)',
            topic: 'Algorithms'
          },
          {
            question: 'Which data structure is used to implement a hash table?',
            options: ['Array', 'Linked List', 'Tree', 'Graph'],
            correct_answer: 'Array',
            topic: 'Data Structures'
          }
        ]
      }
      
      try {
        const createdQuiz = await api.post('/quizzes', sampleQuiz)
        // Fetch all quizzes again and sort by question count
        const updatedResponse = await api.get('/quizzes')
        const updatedQuizzes = updatedResponse.data
        // Sort: quizzes with 10 questions first
        updatedQuizzes.sort((a: Quiz, b: Quiz) => {
          if (a.questions.length === 10 && b.questions.length !== 10) return -1
          if (a.questions.length !== 10 && b.questions.length === 10) return 1
          return 0
        })
        setQuizzes(updatedQuizzes)
      } catch (createError) {
        console.error('Failed to create sample quiz:', createError)
      }
    }
  }

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setAnswers(new Array(quiz.questions.length).fill(''))
    setSubmitted(false)
    setScore(null)
  }

  const handleAnswerChange = (index: number, answer: string) => {
    const newAnswers = [...answers]
    newAnswers[index] = answer
    setAnswers(newAnswers)
  }

  const handleSubmit = async () => {
    if (!selectedQuiz) return
    
    if (answers.some(a => !a)) {
      alert('Please answer all questions')
      return
    }

    // Check if quiz has a valid ID (from database)
    if (!selectedQuiz.id || selectedQuiz.id === 0) {
      alert('This is a sample quiz. Please create a quiz first to submit answers.')
      return
    }

    try {
      const response = await api.post(`/quizzes/${selectedQuiz.id}/attempt`, {
        answers
      })
      setScore(response.data.score)
      setSubmitted(true)
    } catch (error: any) {
      console.error('Failed to submit quiz:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to submit quiz. Please try again.'
      alert(errorMessage)
    }
  }

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/quizzes', newQuiz)
      setShowCreateForm(false)
      setNewQuiz({
        title: '',
        questions: [{ question: '', options: ['', '', '', ''], correct_answer: '', topic: '' }]
      })
      await fetchQuizzes()
    } catch (error: any) {
      console.error('Failed to create quiz:', error)
      alert(error.response?.data?.detail || 'Failed to create quiz. Please try again.')
    }
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>Diagnostic Quiz</h1>

      {!selectedQuiz ? (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Available Quizzes</h2>
              <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? 'Cancel' : 'Create Quiz'}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateQuiz} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div className="form-group">
                  <label className="label">Quiz Title</label>
                  <input
                    type="text"
                    className="input"
                    value={newQuiz.title}
                    onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                    required
                  />
                </div>
                {newQuiz.questions.map((q, qIdx) => (
                  <div key={qIdx} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label className="label">Question {qIdx + 1}</label>
                      <input
                        type="text"
                        className="input"
                        value={q.question}
                        onChange={(e) => {
                          const newQuestions = [...newQuiz.questions]
                          newQuestions[qIdx].question = e.target.value
                          setNewQuiz({ ...newQuiz, questions: newQuestions })
                        }}
                        required
                      />
                    </div>
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="form-group">
                        <label className="label">Option {optIdx + 1}</label>
                        <input
                          type="text"
                          className="input"
                          value={opt}
                          onChange={(e) => {
                            const newQuestions = [...newQuiz.questions]
                            newQuestions[qIdx].options[optIdx] = e.target.value
                            setNewQuiz({ ...newQuiz, questions: newQuestions })
                          }}
                          required
                        />
                      </div>
                    ))}
                    <div className="form-group">
                      <label className="label">Correct Answer</label>
                      <select
                        className="input"
                        value={q.correct_answer}
                        onChange={(e) => {
                          const newQuestions = [...newQuiz.questions]
                          newQuestions[qIdx].correct_answer = e.target.value
                          setNewQuiz({ ...newQuiz, questions: newQuestions })
                        }}
                        required
                      >
                        <option value="">Select correct answer</option>
                        {q.options.map((opt, optIdx) => (
                          <option key={optIdx} value={opt}>
                            {opt || `Option ${optIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <button type="submit" className="btn btn-primary">Create Quiz</button>
              </form>
            )}

            {quizzes.length === 0 ? (
              <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No quizzes available. Create one above!</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    style={{
                      padding: '1.5rem',
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
                      <h3 style={{ marginBottom: '0.5rem' }}>{quiz.title}</h3>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{quiz.questions.length} questions</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleStartQuiz(quiz)}>
                      Start Quiz
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>{selectedQuiz.title}</h2>
            <button className="btn btn-secondary" onClick={() => {
              setSelectedQuiz(null)
              setSubmitted(false)
              setScore(null)
            }}>
              Back to Quizzes
            </button>
          </div>

          {!submitted ? (
            <>
              {selectedQuiz.questions.map((question, index) => (
                <div key={index} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h3 style={{ marginBottom: '1rem' }}>
                    {index + 1}. {question.question}
                  </h3>
                  {question.topic && (
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem', display: 'block' }}>
                      Topic: {question.topic}
                    </span>
                  )}
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {question.options.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        style={{
                          padding: '1rem',
                          background: answers[index] === option 
                            ? 'rgba(102, 126, 234, 0.3)' 
                            : 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(10px)',
                          border: `2px solid ${answers[index] === option ? 'rgba(102, 126, 234, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#e0e0e0',
                          transition: 'all 0.3s ease',
                          boxShadow: answers[index] === option 
                            ? '0 4px 15px rgba(102, 126, 234, 0.3)' 
                            : '0 2px 8px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option}
                          checked={answers[index] === option}
                          onChange={() => handleAnswerChange(index, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit} 
                style={{ width: '100%' }}
                disabled={submitted}
              >
                {submitted ? 'Submitted' : 'Submit Quiz'}
              </button>
            </>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Your Score: {score?.toFixed(1)}%</h2>
                <p style={{ color: score && score >= 70 ? '#38ef7d' : '#ff6b6b', fontSize: '1.2rem', textShadow: score && score >= 70 ? '0 2px 10px rgba(56, 239, 125, 0.5)' : '0 2px 10px rgba(255, 107, 107, 0.5)' }}>
                  {score && score >= 70 ? 'Great job! 🎉' : 'Keep practicing! 💪'}
                </p>
              </div>
              {selectedQuiz.questions.map((question, index) => {
                const isCorrect = question.correct_answer === answers[index]
                return (
                  <div
                    key={index}
                    style={{
                      marginBottom: '1.5rem',
                      padding: '1.5rem',
                      background: isCorrect 
                        ? 'rgba(56, 239, 125, 0.2)' 
                        : 'rgba(255, 107, 107, 0.2)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      border: `2px solid ${isCorrect ? 'rgba(56, 239, 125, 0.5)' : 'rgba(255, 107, 107, 0.5)'}`,
                      boxShadow: isCorrect 
                        ? '0 4px 15px rgba(56, 239, 125, 0.3)' 
                        : '0 4px 15px rgba(255, 107, 107, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <h3>{index + 1}. {question.question}</h3>
                      <span style={{ fontSize: '1.5rem' }}>{isCorrect ? '✓' : '✗'}</span>
                    </div>
                    <p><strong>Your answer:</strong> {answers[index]}</p>
                    {!isCorrect && <p><strong>Correct answer:</strong> {question.correct_answer}</p>}
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn btn-primary" onClick={() => {
                  setSelectedQuiz(null)
                  setSubmitted(false)
                  setScore(null)
                }}>
                  Back to Quizzes
                </button>
                <button className="btn btn-secondary" onClick={() => window.location.href = '/weaknesses'}>
                  View Weak Areas
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

