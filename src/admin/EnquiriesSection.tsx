import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

type EnquiryStatus = 'New' | 'Contacted' | 'Accepted' | 'Declined'

type Enquiry = {
  id: string
  client_name: string
  email: string
  phone: string | null
  service: string
  project_name: string
  description: string
  budget: number | null
  start_date: string
  due_date: string
  status: EnquiryStatus
  created_at: string
}

type ClientMatch = {
  id: string
  email: string | null
}

const gold = '#D7B477'

export default function EnquiriesSection() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [busyEnquiryId, setBusyEnquiryId] = useState<string | null>(null)

  const loadEnquiries = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select(
          'id, client_name, email, phone, service, project_name, description, budget, start_date, due_date, status, created_at',
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      setEnquiries((data ?? []) as Enquiry[])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load enquiries.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEnquiries()
  }, [])

  const handleUpdateStatus = async (
    enquiry: Enquiry,
    status: EnquiryStatus,
  ) => {
    if (busyEnquiryId) return

    setBusyEnquiryId(enquiry.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error } = await supabase
        .from('enquiries')
        .update({ status })
        .eq('id', enquiry.id)

      if (error) throw error

      setEnquiries((previous) =>
        previous.map((item) =>
          item.id === enquiry.id ? { ...item, status } : item,
        ),
      )

      setSuccessMessage(
        status === 'Contacted'
          ? 'Enquiry marked as contacted.'
          : 'Enquiry declined.',
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the enquiry.',
      )
    } finally {
      setBusyEnquiryId(null)
    }
  }

  const handleCreateProject = async (enquiry: Enquiry) => {
    if (busyEnquiryId) return

    if (enquiry.status === 'Accepted') {
      setErrorMessage(
        'This enquiry is already marked as accepted. Check the Projects section.',
      )
      return
    }

    const confirmed = window.confirm(
      `Create a project for "${enquiry.project_name}" from this enquiry?`,
    )

    if (!confirmed) return

    setBusyEnquiryId(enquiry.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data: clientRows, error: clientLookupError } = await supabase
        .from('clients')
        .select('id, email')

      if (clientLookupError) throw clientLookupError

      const existingClient = (clientRows ?? []).find(
        (client: ClientMatch) =>
          client.email?.trim().toLowerCase() ===
          enquiry.email.trim().toLowerCase(),
      )

      let clientId = existingClient?.id

      if (!clientId) {
        const { data: newClient, error: createClientError } = await supabase
          .from('clients')
          .insert({
            client_name: enquiry.client_name,
            email: enquiry.email,
            phone: enquiry.phone,
            company_name: null,
            notes: `Added from portfolio enquiry. Service: ${enquiry.service}`,
          })
          .select('id')
          .single()

        if (createClientError) throw createClientError
        if (!newClient) throw new Error('The client record was not returned.')

        clientId = newClient.id
      }

      const projectDescription =
        `Service: ${enquiry.service}\n\n${enquiry.description}`

      const { error: createProjectError } = await supabase
        .from('projects')
        .insert({
          project_name: enquiry.project_name,
          client_id: clientId,
          description: projectDescription,
          status: 'Planning',
          budget: enquiry.budget,
          start_date: enquiry.start_date || null,
          due_date: enquiry.due_date || null,
        })

      if (createProjectError) throw createProjectError

      const { error: updateEnquiryError } = await supabase
        .from('enquiries')
        .update({ status: 'Accepted' })
        .eq('id', enquiry.id)

      if (updateEnquiryError) {
        throw new Error(
          'Project was created, but the enquiry status could not be updated. Check Projects before trying again.',
        )
      }

      setEnquiries((previous) =>
        previous.map((item) =>
          item.id === enquiry.id
            ? { ...item, status: 'Accepted' }
            : item,
        ),
      )

      setSuccessMessage(
        'Project created and linked to the client, including the requested dates.',
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create a project from this enquiry.',
      )
    } finally {
      setBusyEnquiryId(null)
    }
  }

  const panelStyle: React.CSSProperties = {
    background: '#151310',
    border: '1px solid #3B3021',
    borderRadius: 16,
    padding: 22,
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    minWidth: 1000,
    borderCollapse: 'collapse',
    fontSize: 13,
  }

  const buttonStyle: React.CSSProperties = {
    border: '1px solid #755B36',
    borderRadius: 7,
    padding: '8px 10px',
    background: '#201910',
    color: '#E4C78F',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  }

  return (
    <div>
      <section style={{ ...panelStyle, marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                color: gold,
                fontFamily: 'Georgia, serif',
                fontSize: 23,
                margin: '0 0 8px',
              }}
            >
              Portfolio Enquiries
            </h2>

            <p
              style={{
                color: '#AFA79C',
                fontSize: 13,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              New project requests submitted through your portfolio appear here.
            </p>
          </div>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => void loadEnquiries()}
            disabled={loading || busyEnquiryId !== null}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          style={{
            color: '#FFC3AE',
            background: '#281611',
            border: '1px solid #704536',
            borderRadius: 9,
            padding: 14,
            marginBottom: 16,
            overflowWrap: 'anywhere',
            fontSize: 13,
          }}
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            color: gold,
            background: '#201910',
            border: '1px solid #493A25',
            borderRadius: 9,
            padding: 14,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {successMessage}
        </div>
      )}

      <section style={panelStyle}>
        <h2
          style={{
            color: gold,
            fontFamily: 'Georgia, serif',
            fontSize: 22,
            marginTop: 0,
          }}
        >
          Enquiries List ({enquiries.length})
        </h2>

        {loading ? (
          <p style={{ color: '#AFA79C' }}>Loading enquiries...</p>
        ) : enquiries.length === 0 ? (
          <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>
            No enquiries yet. Requests submitted through the portfolio will
            appear here.
          </p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {[
                    'Client / Contact',
                    'Project Request',
                    'Budget',
                    'Start Date',
                    'Due Date',
                    'Status',
                    'Received',
                    'Actions',
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        color: gold,
                        textAlign: 'left',
                        padding: '12px 10px',
                        borderBottom: '1px solid #493A25',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {enquiries.map((enquiry) => {
                  const isBusy = busyEnquiryId === enquiry.id

                  return (
                    <tr key={enquiry.id}>
                      <td
                        style={{
                          color: '#D8D0C4',
                          padding: '14px 10px',
                          borderBottom: '1px solid #302719',
                          verticalAlign: 'top',
                        }}
                      >
                        <strong style={{ color: '#F5E4C7' }}>
                          {enquiry.client_name}
                        </strong>
                        <div style={{ marginTop: 5 }}>{enquiry.email}</div>
                        {enquiry.phone && (
                          <div style={{ marginTop: 4 }}>{enquiry.phone}</div>
                        )}
                      </td>

                      <td
                        style={{
                          color: '#D8D0C4',
                          padding: '14px 10px',
                          borderBottom: '1px solid #302719',
                          verticalAlign: 'top',
                          minWidth: 220,
                        }}
                      >
                        <strong style={{ color: '#F5E4C7' }}>
                          {enquiry.project_name}
                        </strong>
                        <div style={{ color: gold, marginTop: 5 }}>
                          {enquiry.service}
                        </div>
                        <div
                          style={{
                            color: '#AFA79C',
                            marginTop: 7,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                          }}
                        >
                          {enquiry.description}
                        </div>
                      </td>

                      <td
                        style={{
                          color: '#D8D0C4',
                          padding: '14px 10px',
                          borderBottom: '1px solid #302719',
                          verticalAlign: 'top',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {enquiry.budget === null
                          ? '—'
                          : `₹${Number(enquiry.budget).toLocaleString('en-IN')}`}
                      </td>

                      <td
                        style={{
                          color: '#D8D0C4',
                          padding: '14px 10px',
                          borderBottom: '1px solid #302719',
                          verticalAlign: 'top',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {enquiry.start_date || '—'}
                      </td>

                      <td
                        style={{
                          color: '#D8D0C4',
                          padding: '14px 10px',
                          borderBottom: '1px solid #302719',
                          verticalAlign: 'top',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {enquiry.due_date || '—'}
                      </td>

                      <td
                        style={{
                          padding: '14px 10px',
                          borderBottom: '1px solid #302719',
                          verticalAlign: 'top',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            color:
                              enquiry.status === 'Accepted'
                                ? '#9FE0A8'
                                : enquiry.status === 'Declined'
                                  ? '#F0A69A'
                                  : gold,
                            background: '#201910',
                            border: '1px solid #493A25',
                            borderRadius: 20,
                            padding: '5px 9px',
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {enquiry.status}
                        </span>
                      </td>

                      <td
                        style={{
                          color: '#D8D0C4',
                          padding: '14px 10px',
                          borderBottom: '1px solid #302719',
                          verticalAlign: 'top',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(enquiry.created_at).toLocaleDateString()}
                      </td>

                      <td
                        style={{
                          padding: '14px 10px',
                          borderBottom: '1px solid #302719',
                          verticalAlign: 'top',
                          minWidth: 145,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          {enquiry.status !== 'Accepted' && (
                            <button
                              type="button"
                              style={buttonStyle}
                              disabled={busyEnquiryId !== null}
                              onClick={() =>
                                void handleCreateProject(enquiry)
                              }
                            >
                              {isBusy ? 'Working...' : 'Create Project'}
                            </button>
                          )}

                          {enquiry.status === 'New' && (
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                color: '#D8D0C4',
                              }}
                              disabled={busyEnquiryId !== null}
                              onClick={() =>
                                void handleUpdateStatus(enquiry, 'Contacted')
                              }
                            >
                              Mark Contacted
                            </button>
                          )}

                          {(enquiry.status === 'New' ||
                            enquiry.status === 'Contacted') && (
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                color: '#F0C7A7',
                                background: '#2A1712',
                                borderColor: '#704536',
                              }}
                              disabled={busyEnquiryId !== null}
                              onClick={() =>
                                void handleUpdateStatus(enquiry, 'Declined')
                              }
                            >
                              Decline
                            </button>
                          )}
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