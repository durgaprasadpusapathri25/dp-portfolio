import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../supabase'

type ProjectStatus = 'Planning' | 'In Progress' | 'Completed' | 'On Hold'

type ClientOption = {
  id: string
  client_name: string
}

type Project = {
  id: string
  project_name: string
  client_id: string | null
  description: string | null
  status: ProjectStatus
  budget: number | null
  start_date: string | null
  due_date: string | null
  created_at: string
}

const accent = '#E50914'

const projectStatuses: ProjectStatus[] = [
  'Planning',
  'In Progress',
  'Completed',
  'On Hold',
]

export default function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [projectName, setProjectName] = useState('')
  const [clientId, setClientId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('In Progress')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [projectsResult, clientsResult] = await Promise.all([
          supabase
            .from('projects')
            .select(
              'id, project_name, client_id, description, status, budget, start_date, due_date, created_at',
            )
            .order('created_at', { ascending: false }),

          supabase
            .from('clients')
            .select('id, client_name')
            .order('client_name', { ascending: true }),
        ])

        if (projectsResult.error) throw projectsResult.error
        if (clientsResult.error) throw clientsResult.error
        if (cancelled) return

        setProjects((projectsResult.data ?? []) as Project[])
        setClients((clientsResult.data ?? []) as ClientOption[])
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load projects.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const resetForm = () => {
    setEditingId('')
    setProjectName('')
    setClientId('')
    setDescription('')
    setStatus('In Progress')
    setBudget('')
    setStartDate('')
    setDueDate('')
  }

  const handleSaveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return

    setError('')
    setMessage('')

    if (!projectName.trim()) {
      setError('Please enter a project name.')
      return
    }

    const parsedBudget = budget.trim() ? Number(budget) : null
    if (
      parsedBudget !== null &&
      (!Number.isFinite(parsedBudget) || parsedBudget < 0)
    ) {
      setError('Please enter a valid budget of zero or more.')
      return
    }

    if (startDate && dueDate && dueDate < startDate) {
      setError('Due date cannot be earlier than the start date.')
      return
    }

    const projectDetails = {
      project_name: projectName.trim(),
      client_id: clientId || null,
      description: description.trim() || null,
      status,
      budget: parsedBudget,
      start_date: startDate || null,
      due_date: dueDate || null,
    }

    setSaving(true)

    try {
      if (editingId) {
        const { data, error: updateError } = await supabase
          .from('projects')
          .update(projectDetails)
          .eq('id', editingId)
          .select(
            'id, project_name, client_id, description, status, budget, start_date, due_date, created_at',
          )
          .single()

        if (updateError) throw updateError

        setProjects((previous) =>
          previous.map((project) =>
            project.id === editingId ? (data as Project) : project,
          ),
        )
        resetForm()
        setMessage('Project updated successfully.')
      } else {
        const { data, error: insertError } = await supabase
          .from('projects')
          .insert(projectDetails)
          .select(
            'id, project_name, client_id, description, status, budget, start_date, due_date, created_at',
          )
          .single()

        if (insertError) throw insertError

        setProjects((previous) => [data as Project, ...previous])
        resetForm()
        setMessage('Project added successfully.')
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the project.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleEditProject = (project: Project) => {
    setError('')
    setMessage('')
    setEditingId(project.id)
    setProjectName(project.project_name)
    setClientId(project.client_id ?? '')
    setDescription(project.description ?? '')
    setStatus(project.status)
    setBudget(project.budget === null ? '' : String(project.budget))
    setStartDate(project.start_date ?? '')
    setDueDate(project.due_date ?? '')
    document
      .getElementById('project-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleDeleteProject = async (project: Project) => {
    const confirmed = window.confirm(
      `Delete "${project.project_name}"? Its linked payment records will remain, but their project link will be removed.`,
    )
    if (!confirmed) return

    setError('')
    setMessage('')
    setDeletingId(project.id)

    try {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (deleteError) throw deleteError

      setProjects((previous) =>
        previous.filter((item) => item.id !== project.id),
      )

      if (editingId === project.id) resetForm()
      setMessage('Project deleted successfully.')
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete the project.',
      )
    } finally {
      setDeletingId('')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#141414',
    color: '#F5F5F1',
    border: '1px solid #3A3A3A',
    borderRadius: 8,
    padding: '12px 13px',
    outlineColor: accent,
    fontSize: 14,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#D7D7D2',
    fontSize: 13,
    marginBottom: 7,
  }

  const cardStyle: React.CSSProperties = {
    background: '#181818',
    border: '1px solid #3A3A3A',
    borderRadius: 16,
    padding: 24,
    minWidth: 0,
  }

  const actionButtonStyle: React.CSSProperties = {
    border: '1px solid #E50914',
    borderRadius: 7,
    padding: '8px 11px',
    background: '#181818',
    color: accent,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }

  return (
    <div>
      <section
        id="project-form"
        style={{ ...cardStyle, marginBottom: 22 }}
      >
        <h2
          style={{
            color: accent,
            fontFamily: 'Georgia, serif',
            fontSize: 23,
            marginTop: 0,
          }}
        >
          {editingId ? 'Edit Project' : 'Add New Project'}
        </h2>

        <p style={{ color: '#B3B3B3', fontSize: 13, lineHeight: 1.7 }}>
          {editingId
            ? 'Update this project’s details below.'
            : 'Add project details and optionally link the project to a client.'}
        </p>

        <form onSubmit={handleSaveProject}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(min(100%,220px),1fr))',
              gap: 16,
              marginTop: 22,
            }}
          >
            <div>
              <label style={labelStyle} htmlFor="project-name">
                Project Name *
              </label>
              <input
                id="project-name"
                style={inputStyle}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Enter project name"
                maxLength={200}
                required
                disabled={saving || loading}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="project-client">
                Client
              </label>
              <select
                id="project-client"
                style={inputStyle}
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                disabled={saving || loading}
              >
                <option value="">No client selected</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle} htmlFor="project-status">
                Status
              </label>
              <select
                id="project-status"
                style={inputStyle}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProjectStatus)
                }
                disabled={saving || loading}
              >
                {projectStatuses.map((projectStatus) => (
                  <option key={projectStatus} value={projectStatus}>
                    {projectStatus}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle} htmlFor="project-budget">
                Budget
              </label>
              <input
                id="project-budget"
                type="number"
                min="0"
                step="0.01"
                style={inputStyle}
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Optional amount"
                disabled={saving || loading}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="project-start-date">
                Start Date
              </label>
              <input
                id="project-start-date"
                type="date"
                style={inputStyle}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={saving || loading}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="project-due-date">
                Due Date
              </label>
              <input
                id="project-due-date"
                type="date"
                style={inputStyle}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={saving || loading}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle} htmlFor="project-description">
                Description
              </label>
              <textarea
                id="project-description"
                style={{
                  ...inputStyle,
                  minHeight: 90,
                  resize: 'vertical',
                }}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Project details..."
                maxLength={3000}
                disabled={saving || loading}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              type="submit"
              disabled={saving || loading}
              style={{
                border: '1px solid #E50914',
                borderRadius: 8,
                padding: '12px 18px',
                background: '#E50914',
                color: '#FFFFFF',
                fontWeight: 700,
                cursor: saving || loading ? 'wait' : 'pointer',
                opacity: saving || loading ? 0.6 : 1,
              }}
            >
              {saving
                ? 'SAVING PROJECT...'
                : editingId
                  ? 'SAVE CHANGES'
                  : '+ ADD PROJECT'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setError('')
                  setMessage('')
                }}
                disabled={saving}
                style={actionButtonStyle}
              >
                CANCEL EDIT
              </button>
            )}
          </div>
        </form>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            color: '#FFC3C3',
            background: '#281111',
            border: '1px solid #7A2222',
            borderRadius: 9,
            padding: 14,
            marginBottom: 18,
            overflowWrap: 'anywhere',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            color: '#E50914',
            background: '#241416',
            border: '1px solid #3A3A3A',
            borderRadius: 9,
            padding: 14,
            marginBottom: 18,
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}

      <section style={cardStyle}>
        <h2
          style={{
            color: accent,
            fontFamily: 'Georgia, serif',
            fontSize: 23,
            marginTop: 0,
          }}
        >
          Projects List ({projects.length})
        </h2>

        {loading ? (
          <p style={{ color: '#B3B3B3' }}>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: '#B3B3B3', lineHeight: 1.7 }}>
            No projects have been added yet.
          </p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 900,
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {[
                    'Project',
                    'Client',
                    'Status',
                    'Budget',
                    'Start Date',
                    'Due Date',
                    'Actions',
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        color: accent,
                        textAlign: 'left',
                        fontWeight: 600,
                        borderBottom: '1px solid #3A3A3A',
                        padding: '13px 10px',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {projects.map((project) => {
                  const projectClient = clients.find(
                    (client) => client.id === project.client_id,
                  )
                  const rowBusy =
                    saving ||
                    deletingId === project.id ||
                    deletingId !== ''

                  return (
                    <tr key={project.id}>
                      <td
                        style={{
                          color: '#D7D7D2',
                          borderBottom: '1px solid #303030',
                          padding: '14px 10px',
                        }}
                      >
                        <strong style={{ color: '#F5F5F1' }}>
                          {project.project_name}
                        </strong>
                        {project.description && (
                          <div
                            style={{
                              color: '#8B8B8B',
                              marginTop: 5,
                              maxWidth: 260,
                            }}
                          >
                            {project.description}
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          color: '#D7D7D2',
                          borderBottom: '1px solid #303030',
                          padding: '14px 10px',
                        }}
                      >
                        {projectClient?.client_name ?? '—'}
                      </td>

                      <td
                        style={{
                          color: '#D7D7D2',
                          borderBottom: '1px solid #303030',
                          padding: '14px 10px',
                        }}
                      >
                        {project.status}
                      </td>

                      <td
                        style={{
                          color: '#D7D7D2',
                          borderBottom: '1px solid #303030',
                          padding: '14px 10px',
                        }}
                      >
                        {project.budget === null
                          ? '—'
                          : `₹${Number(project.budget).toLocaleString('en-IN')}`}
                      </td>

                      <td
                        style={{
                          color: '#D7D7D2',
                          borderBottom: '1px solid #303030',
                          padding: '14px 10px',
                        }}
                      >
                        {project.start_date || '—'}
                      </td>

                      <td
                        style={{
                          color: '#D7D7D2',
                          borderBottom: '1px solid #303030',
                          padding: '14px 10px',
                        }}
                      >
                        {project.due_date || '—'}
                      </td>

                      <td
                        style={{
                          borderBottom: '1px solid #303030',
                          padding: '14px 10px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleEditProject(project)}
                            disabled={rowBusy}
                            style={{
                              ...actionButtonStyle,
                              opacity: rowBusy ? 0.55 : 1,
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDeleteProject(project)}
                            disabled={rowBusy}
                            style={{
                              ...actionButtonStyle,
                              borderColor: '#7A2222',
                              color: '#FFC3C3',
                              opacity: rowBusy ? 0.55 : 1,
                            }}
                          >
                            {deletingId === project.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

