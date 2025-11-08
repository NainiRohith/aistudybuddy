import { useState, useEffect } from 'react'
import api from '../services/api'
import '../App.css'

interface Resource {
  id: number
  title: string
  description: string | null
  resource_type: string | null
  url: string | null
  topics: string[] | null
}

export default function ResourceFinder() {
  const [resources, setResources] = useState<Resource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    resource_type: '',
    url: '',
    topics: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchResources()
  }, [searchQuery, topicFilter, resourceType])

  const fetchResources = async () => {
    try {
      const params: any = {}
      if (searchQuery) params.query = searchQuery
      if (topicFilter) params.topic = topicFilter
      if (resourceType) params.resource_type = resourceType
      
      const response = await api.get('/resources', { params })
      setResources(response.data)
    } catch (error) {
      console.error('Failed to fetch resources:', error)
    }
  }

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/resources', {
        ...newResource,
        topics: newResource.topics ? newResource.topics.split(',').map(t => t.trim()) : []
      })
      setNewResource({ title: '', description: '', resource_type: '', url: '', topics: '' })
      setShowAddForm(false)
      fetchResources()
    } catch (error) {
      console.error('Failed to add resource:', error)
    }
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>Resource Finder</h1>

      <div className="card">
        <h2>Search Resources</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search by title or description"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Topic</label>
            <input
              type="text"
              className="input"
              placeholder="Filter by topic"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="notes">Notes</option>
              <option value="past_paper">Past Paper</option>
              <option value="video">Video</option>
              <option value="article">Article</option>
            </select>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Resource'}
        </button>
      </div>

      {showAddForm && (
        <div className="card">
          <h2>Add New Resource</h2>
          <form onSubmit={handleAddResource}>
            <div className="form-group">
              <label className="label">Title</label>
              <input
                type="text"
                className="input"
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={3}
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="label">Type</label>
              <select
                className="input"
                value={newResource.resource_type}
                onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="notes">Notes</option>
                <option value="past_paper">Past Paper</option>
                <option value="video">Video</option>
                <option value="article">Article</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">URL</label>
              <input
                type="url"
                className="input"
                value={newResource.url}
                onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="label">Topics (comma-separated)</label>
              <input
                type="text"
                className="input"
                value={newResource.topics}
                onChange={(e) => setNewResource({ ...newResource, topics: e.target.value })}
                placeholder="e.g., algorithms, data structures, recursion"
              />
            </div>
            <button type="submit" className="btn btn-primary">Add Resource</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Resources ({resources.length})</h2>
        {resources.length === 0 ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No resources found. Try adjusting your search or add a new resource.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {resources.map((resource) => (
              <div
                key={resource.id}
                style={{
                  padding: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>{resource.title}</h3>
                  {resource.resource_type && (
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        background: 'rgba(102, 126, 234, 0.3)',
                        color: '#a78bfa',
                        border: '1px solid rgba(102, 126, 234, 0.4)'
                      }}
                    >
                      {resource.resource_type}
                    </span>
                  )}
                </div>
                {resource.description && (
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>{resource.description}</p>
                )}
                {resource.topics && resource.topics.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    {resource.topics.map((topic, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          marginRight: '0.5rem',
                          marginBottom: '0.25rem',
                          background: 'rgba(102, 126, 234, 0.2)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          border: '1px solid rgba(102, 126, 234, 0.3)'
                        }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#4f46e5', textDecoration: 'none' }}
                  >
                    Open Resource →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

