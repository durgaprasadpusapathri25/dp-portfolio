import {
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './supabase'

const services = [
  'Website Design & Development',
  'Graphic Design & Branding',
  'Video Editing & Motion Graphics',
  'Creative Digital Experiences',
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 13px',
  border: '1px solid #493A25',
  borderRadius: 8,
  background: '#0C0B0A',
  color: '#F7F2E9',
  fontSize: 14,
  outlineColor: '#D7B477',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#D8C9AE',
  fontSize: 13,
  marginBottom: 7,
}

export default function StartProjectForm() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sentName, setSentName] = useState('')

  const [clientName, setClientName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [service, setService] = useState(services[0])
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, saving])

  const closeForm = () => {
    if (saving) return
    setOpen(false)
    setError('')
  }

  const openCalendar = (event: MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget as HTMLInputElement & {
      showPicker?: () => void
    }

    try {
      input.showPicker?.()
    } catch {
      // The browser can still open the date picker from the calendar icon.
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (saving) return

    setError('')

    const parsedBudget = budget.trim() ? Number(budget) : null

    if (
      parsedBudget !== null &&
      (!Number.isFinite(parsedBudget) || parsedBudget < 0)
    ) {
      setError('Please enter a valid budget of zero or more.')
      return
    }

    if (dueDate < startDate) {
      setError('Preferred due date cannot be earlier than the start date.')
      return
    }

    setSaving(true)

    try {
      const { error: submitError } = await supabase
        .from('enquiries')
        .insert({
          client_name: clientName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          service,
          project_name: projectName.trim(),
          description: description.trim(),
          budget: parsedBudget,
          start_date: startDate,
          due_date: dueDate,
        })

      if (submitError) {
        setError(submitError.message)
        return
      }

      setSentName(clientName.trim())
      setClientName('')
      setEmail('')
      setPhone('')
      setService(services[0])
      setProjectName('')
      setDescription('')
      setBudget('')
      setStartDate('')
      setDueDate('')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to send the request. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="primary-button"
        onClick={() => {
          setError('')
          setSentName('')
          setOpen(true)
        }}
        style={{
          marginTop: 45,
          padding: '17px 35px',
          background: 'linear-gradient(135deg, #e4c78f, #b98d4c)',
          color: '#15110b',
          border: 0,
          borderRadius: 7,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.5px',
          cursor: 'pointer',
        }}
      >
        Start a Project ↗
      </button>

      {open &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeForm()
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              display: 'grid',
              placeItems: 'center',
              overflowY: 'auto',
              padding: 20,
              boxSizing: 'border-box',
              background: 'rgba(0, 0, 0, 0.78)',
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="start-project-title"
              style={{
                width: '100%',
                maxWidth: 720,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxSizing: 'border-box',
                padding: 26,
                border: '1px solid #493A25',
                borderRadius: 16,
                background: '#151310',
                color: '#F7F2E9',
                boxShadow: '0 24px 80px rgba(0,0,0,.55)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 18,
                }}
              >
                <div>
                  <p
                    style={{
                      color: '#D7B477',
                      fontSize: 11,
                      letterSpacing: 3,
                      margin: '0 0 10px',
                    }}
                  >
                    LET’S BUILD SOMETHING
                  </p>
                  <h2
                    id="start-project-title"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 28,
                      margin: 0,
                    }}
                  >
                    Start a Project
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  aria-label="Close project form"
                  style={{
                    border: '1px solid #493A25',
                    borderRadius: 8,
                    padding: '7px 11px',
                    background: '#0C0B0A',
                    color: '#D7B477',
                    fontSize: 20,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>

              {sentName ? (
                <div
                  role="status"
                  style={{
                    marginTop: 24,
                    padding: 18,
                    border: '1px solid #493A25',
                    borderRadius: 10,
                    background: '#201910',
                    color: '#E4C78F',
                    lineHeight: 1.7,
                  }}
                >
                  Thanks, {sentName}! Your project request was sent. I’ll get
                  back to you soon.
                  <button
                    type="button"
                    onClick={closeForm}
                    style={{
                      display: 'block',
                      marginTop: 16,
                      padding: '11px 16px',
                      border: 0,
                      borderRadius: 7,
                      background: '#D7B477',
                      color: '#17110A',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    CLOSE
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <p
                    style={{
                      color: '#AFA79C',
                      fontSize: 13,
                      lineHeight: 1.7,
                      margin: '14px 0 20px',
                    }}
                  >
                    Tell me about your project. Your request will be sent to DP
                    Creative Studio.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit,minmax(min(100%,240px),1fr))',
                      gap: 16,
                    }}
                  >
                    <div>
                      <label style={labelStyle} htmlFor="request-client-name">
                        Your Name *
                      </label>
                      <input
                        id="request-client-name"
                        style={inputStyle}
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                        autoComplete="name"
                        maxLength={150}
                        required
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="request-email">
                        Email *
                      </label>
                      <input
                        id="request-email"
                        type="email"
                        style={inputStyle}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        maxLength={254}
                        required
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="request-phone">
                        Phone
                      </label>
                      <input
                        id="request-phone"
                        type="tel"
                        style={inputStyle}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        autoComplete="tel"
                        maxLength={30}
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="request-service">
                        Service *
                      </label>
                      <select
                        id="request-service"
                        style={inputStyle}
                        value={service}
                        onChange={(event) => setService(event.target.value)}
                        required
                      >
                        {services.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="request-project-name">
                        Project Name *
                      </label>
                      <input
                        id="request-project-name"
                        style={inputStyle}
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        placeholder="For example: Business website"
                        maxLength={200}
                        required
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="request-budget">
                        Budget (optional)
                      </label>
                      <input
                        id="request-budget"
                        type="number"
                        min="0"
                        step="0.01"
                        style={inputStyle}
                        value={budget}
                        onChange={(event) => setBudget(event.target.value)}
                        placeholder="₹"
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="request-start-date">
                        Preferred Start Date *
                      </label>
                      <input
                        id="request-start-date"
                        type="date"
                        style={inputStyle}
                        value={startDate}
                        onClick={openCalendar}
                        onChange={(event) => {
                          setStartDate(event.target.value)
                          if (dueDate && event.target.value > dueDate) {
                            setDueDate('')
                          }
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="request-due-date">
                        Preferred Due Date *
                      </label>
                      <input
                        id="request-due-date"
                        type="date"
                        style={inputStyle}
                        value={dueDate}
                        min={startDate || undefined}
                        onClick={openCalendar}
                        onChange={(event) => setDueDate(event.target.value)}
                        required
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle} htmlFor="request-description">
                        Project Details *
                      </label>
                      <textarea
                        id="request-description"
                        style={{
                          ...inputStyle,
                          minHeight: 110,
                          resize: 'vertical',
                        }}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="What do you need for this project?"
                        maxLength={3000}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      style={{
                        color: '#FFC3AE',
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      marginTop: 18,
                      padding: '13px 20px',
                      border: '1px solid #9B7845',
                      borderRadius: 8,
                      background: '#D7B477',
                      color: '#17110A',
                      fontWeight: 700,
                      cursor: saving ? 'wait' : 'pointer',
                      opacity: saving ? 0.65 : 1,
                    }}
                  >
                    {saving ? 'SENDING REQUEST...' : 'SEND PROJECT REQUEST'}
                  </button>
                </form>
              )}
            </section>
          </div>,
          document.body,
        )}
    </>
  )
}