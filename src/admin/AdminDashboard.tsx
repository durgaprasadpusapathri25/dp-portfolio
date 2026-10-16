import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import EnquiriesSection from './EnquiriesSection'
import ReceiptsSection from './ReceiptsSection'

type DashboardSection =
  | 'Overview'
  | 'Enquiries'
  | 'Clients'
  | 'Projects'
  | 'Payments'
  | 'Receipts'
  | 'Settings'

type Client = {
  id: string
  client_name: string
  email: string | null
  phone: string | null
  company_name: string | null
  notes: string | null
  created_at: string
}

type OverviewActivity = {
  id: string
  message: string
  created_at: string
}

type ProjectStatus =
  | 'Planning'
  | 'In Progress'
  | 'Completed'
  | 'On Hold'

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

type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded'

type Payment = {
  id: string
  client_id: string | null
  project_id: string | null
  amount: number
  currency: 'INR' | 'USD'
  payment_method: string | null
  payment_status: PaymentStatus
  payment_date: string | null
  notes: string | null
  created_at: string
}
const sections: DashboardSection[] = [
  'Overview',
  'Enquiries',
  'Clients',
  'Projects',
  'Payments',
  'Receipts',
  'Settings',
]

const projectStatuses: ProjectStatus[] = [
  'Planning',
  'In Progress',
  'Completed',
  'On Hold',
]

const gold = '#D7B477'

type StudioSettings = {
  studio_name: string
  email: string
  phone: string
  whatsapp: string
  address: string
  tagline: string
}

const defaultStudioSettings: StudioSettings = {
  studio_name: 'DP Creative Studio',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  tagline: 'Creative services · Digital experiences',
}

function SettingsSection() {
  const [settings, setSettings] = useState<StudioSettings>(defaultStudioSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('studio_settings')
        .select('studio_name, email, phone, whatsapp, address, tagline')
        .eq('id', true)
        .maybeSingle()

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
      } else if (data) {
        setSettings({
          studio_name: data.studio_name ?? defaultStudioSettings.studio_name,
          email: data.email ?? '',
          phone: data.phone ?? '',
          whatsapp: data.whatsapp ?? '',
          address: data.address ?? '',
          tagline: data.tagline ?? '',
        })
      }
      setLoading(false)
    }

    void loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const updateField = (field: keyof StudioSettings, value: string) => {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return

    setError('')
    setMessage('')

    if (!settings.studio_name.trim()) {
      setError('Please enter your studio name.')
      return
    }

    setSaving(true)
    try {
      const { error: saveError } = await supabase
        .from('studio_settings')
        .upsert(
          {
            id: true,
            studio_name: settings.studio_name.trim(),
            email: settings.email.trim() || null,
            phone: settings.phone.trim() || null,
            whatsapp: settings.whatsapp.trim() || null,
            address: settings.address.trim() || null,
            tagline: settings.tagline.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )

      if (saveError) throw saveError
      setSettings((current) => ({ ...current, studio_name: current.studio_name.trim() }))
      setMessage('Studio settings saved successfully.')
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save studio settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#0C0B0A',
    color: '#F7F2E9',
    border: '1px solid #493A25',
    borderRadius: 8,
    padding: '12px 13px',
    outlineColor: gold,
    fontSize: 14,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#D8C9AE',
    fontSize: 13,
    marginBottom: 7,
  }

  const fields: Array<{
    key: keyof StudioSettings
    label: string
    type?: string
    placeholder: string
  }> = [
    { key: 'studio_name', label: 'Studio Name *', placeholder: 'DP Creative Studio' },
    { key: 'email', label: 'Business Email', type: 'email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'Business phone number' },
    { key: 'whatsapp', label: 'WhatsApp Number', type: 'tel', placeholder: 'Include country code, e.g. 919876543210' },
    { key: 'tagline', label: 'Tagline', placeholder: 'Creative services · Digital experiences' },
  ]

  return (
    <div>
      <section className="dp-admin-card" style={{ marginBottom: 22 }}>
        <h2 style={{ color: gold, fontFamily: 'Georgia, serif', fontSize: 23, marginTop: 0 }}>
          Studio Profile
        </h2>
        <p style={{ color: '#AFA79C', fontSize: 13, lineHeight: 1.7 }}>
          Manage the contact and brand details for your studio. These settings are saved securely in Supabase.
        </p>

        {error && (
          <div role="alert" style={{ color: '#FFC3AE', background: '#281611', border: '1px solid #704536', borderRadius: 9, padding: 14, marginBottom: 18, overflowWrap: 'anywhere', fontSize: 13 }}>
            {error}
          </div>
        )}
        {message && (
          <div role="status" style={{ color: '#D7B477', background: '#201910', border: '1px solid #493A25', borderRadius: 9, padding: 14, marginBottom: 18, fontSize: 13 }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 16, marginTop: 22 }}>
            {fields.map((field) => (
              <div key={field.key}>
                <label style={labelStyle} htmlFor={`studio-${field.key}`}>
                  {field.label}
                </label>
                <input
                  id={`studio-${field.key}`}
                  type={field.type ?? 'text'}
                  style={inputStyle}
                  value={settings[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  maxLength={field.key === 'studio_name' ? 150 : 254}
                  required={field.key === 'studio_name'}
                  disabled={loading || saving}
                />
              </div>
            ))}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle} htmlFor="studio-address">Business Address</label>
              <textarea
                id="studio-address"
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                value={settings.address}
                onChange={(event) => updateField('address', event.target.value)}
                placeholder="Studio or business address (optional)"
                maxLength={500}
                disabled={loading || saving}
              />
            </div>
          </div>

          <button className="dp-admin-primary" type="submit" disabled={loading || saving} style={{ marginTop: 20 }}>
            {loading ? 'LOADING SETTINGS...' : saving ? 'SAVING SETTINGS...' : 'SAVE SETTINGS'}
          </button>
        </form>
      </section>

      <section className="dp-admin-card">
        <h2 style={{ color: gold, fontFamily: 'Georgia, serif', fontSize: 20, marginTop: 0 }}>
          Email Configuration
        </h2>
        <p style={{ color: '#AFA79C', lineHeight: 1.8, fontSize: 13, marginBottom: 0 }}>
          Receipt email delivery is configured securely through Supabase Edge Function secrets. SMTP credentials are not shown or edited on this page.
        </p>
      </section>
    </div>
  )
}

export default function AdminDashboard() {
  const [activeSection, setActiveSection] =
    useState<DashboardSection>('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState('')
  const [overviewStats, setOverviewStats] = useState({
    enquiries: 0,
    clients: 0,
    activeProjects: 0,
    revenue: {} as Record<string, number>,
  })
  const [recentActivity, setRecentActivity] = useState<OverviewActivity[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientError, setClientError] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [savingClient, setSavingClient] = useState(false)
  const [deletingClientId, setDeletingClientId] =
    useState<string | null>(null)

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  const [editingClientId, setEditingClientId] =
    useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectError, setProjectError] = useState('')
  const [projectMessage, setProjectMessage] = useState('')
  const [savingProject, setSavingProject] = useState(false)
  const [editingProjectId, setEditingProjectId] =
    useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] =
    useState<string | null>(null)

  const [projectName, setProjectName] = useState('')
  const [projectClientId, setProjectClientId] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectStatus, setProjectStatus] =
    useState<ProjectStatus>('In Progress')
  const [projectBudget, setProjectBudget] = useState('')
  const [projectStartDate, setProjectStartDate] = useState('')
  const [projectDueDate, setProjectDueDate] = useState('')
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentMessage, setPaymentMessage] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [paymentClientId, setPaymentClientId] = useState('')
  const [paymentProjectId, setPaymentProjectId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState<'INR' | 'USD'>('INR')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const clientBusy = savingClient || deletingClientId !== null
  const projectBusy = savingProject || deletingProjectId !== null
  const paymentBusy = savingPayment || deletingPaymentId !== null

  const formDisabled =
    clientBusy || clientsLoading || loggingOut

  const projectFormDisabled =
    projectBusy || projectsLoading || clientsLoading || loggingOut

  // Clear client form fields and leave edit mode.
  const resetClientForm = () => {
    setEditingClientId(null)
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    setCompanyName('')
    setClientNotes('')
  }

  // Fill the form with the selected client's saved details.
  const handleEditClient = (client: Client) => {
    if (formDisabled) return

    setEditingClientId(client.id)
    setClientName(client.client_name)
    setClientEmail(client.email ?? '')
    setClientPhone(client.phone ?? '')
    setCompanyName(client.company_name ?? '')
    setClientNotes(client.notes ?? '')
    setClientError('')
    setClientMessage('')

    document.getElementById('client-name')?.focus()
  }

  // Cancel client editing without saving.
  const handleCancelEdit = () => {
    if (formDisabled) return

    resetClientForm()
    setClientError('')
    setClientMessage('')
  }

  // Load live dashboard totals and recent records when Overview is opened.
  useEffect(() => {
    if (activeSection !== 'Overview') return

    let cancelled = false

    async function loadOverview() {
      setOverviewLoading(true)
      setOverviewError('')

      try {
        const [
          enquiryCount,
          clientCount,
          activeProjectCount,
          recentEnquiries,
          recentClients,
          recentProjects,
          paidPayments,
        ] = await Promise.all([
          supabase.from('enquiries').select('id', { count: 'exact', head: true }),
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .neq('status', 'Completed'),
          supabase
            .from('enquiries')
            .select('id, client_name, project_name, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('clients')
            .select('id, client_name, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('projects')
            .select('id, project_name, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('payments')
            .select('amount, currency, payment_status')
            .eq('payment_status', 'Paid'),
        ])

        const results = [
          enquiryCount,
          clientCount,
          activeProjectCount,
          recentEnquiries,
          recentClients,
          recentProjects,
          paidPayments,
        ]
        const failed = results.find((result) => result.error)
        if (failed?.error) throw failed.error

        const revenue: Record<string, number> = {}
        for (const payment of paidPayments.data ?? []) {
          const currency = String(payment.currency || 'INR').toUpperCase()
          revenue[currency] = (revenue[currency] || 0) + Number(payment.amount || 0)
        }

        const activity: OverviewActivity[] = [
          ...(recentEnquiries.data ?? []).map((item) => ({
            id: `enquiry-${item.id}`,
            message: `New enquiry from ${item.client_name || 'a client'}${item.project_name ? ` — ${item.project_name}` : ''}`,
            created_at: item.created_at,
          })),
          ...(recentClients.data ?? []).map((item) => ({
            id: `client-${item.id}`,
            message: `Client added: ${item.client_name}`,
            created_at: item.created_at,
          })),
          ...(recentProjects.data ?? []).map((item) => ({
            id: `project-${item.id}`,
            message: `Project created: ${item.project_name}`,
            created_at: item.created_at,
          })),
        ]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )
          .slice(0, 6)

        if (!cancelled) {
          setOverviewStats({
            enquiries: enquiryCount.count ?? 0,
            clients: clientCount.count ?? 0,
            activeProjects: activeProjectCount.count ?? 0,
            revenue,
          })
          setRecentActivity(activity)
        }
      } catch (error) {
        if (!cancelled) {
          setOverviewError(
            error instanceof Error
              ? error.message
              : 'Unable to load dashboard information.',
          )
        }
      } finally {
        if (!cancelled) setOverviewLoading(false)
      }
    }

    void loadOverview()

    return () => {
      cancelled = true
    }
  }, [activeSection])
  // Load clients when the Clients section is opened.
  useEffect(() => {
    if (activeSection !== 'Clients') return

    let cancelled = false

    async function loadClients() {
      setClientsLoading(true)
      setClientError('')
      setClientMessage('')

      try {
        const { data, error } = await supabase
          .from('clients')
          .select(
            'id, client_name, email, phone, company_name, notes, created_at',
          )
          .order('created_at', { ascending: false })

        if (error) {
          if (!cancelled) setClientError(error.message)
          return
        }

        if (!cancelled) {
          setClients((data ?? []) as Client[])
        }
      } catch (error) {
        if (!cancelled) {
          setClientError(
            error instanceof Error
              ? error.message
              : 'Unable to load clients.',
          )
        }
      } finally {
        if (!cancelled) setClientsLoading(false)
      }
    }

    void loadClients()

    return () => {
      cancelled = true
    }
  }, [activeSection])

  // Load projects and their client options when Projects is opened.
  useEffect(() => {
    if (activeSection !== 'Projects') return

    let cancelled = false

    async function loadProjectsAndClients() {
      setProjectsLoading(true)
      setClientsLoading(true)
      setProjectError('')

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
            .select(
              'id, client_name, email, phone, company_name, notes, created_at',
            )
            .order('client_name', { ascending: true }),
        ])

        if (projectsResult.error) {
          throw projectsResult.error
        }

        if (clientsResult.error) {
          throw clientsResult.error
        }

        if (!cancelled) {
          setProjects((projectsResult.data ?? []) as Project[])
          setClients((clientsResult.data ?? []) as Client[])
        }
      } catch (error) {
        if (!cancelled) {
          setProjectError(
            error instanceof Error
              ? error.message
              : 'Unable to load projects.',
          )
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false)
          setClientsLoading(false)
        }
      }
    }

    void loadProjectsAndClients()

    return () => {
      cancelled = true
    }
  }, [activeSection])

  // Load payments and their client/project options when Payments is opened.
  useEffect(() => {
    if (activeSection !== 'Payments') return

    let cancelled = false

    async function loadPayments() {
      setPaymentsLoading(true)
      setClientsLoading(true)
      setPaymentError('')
      setPaymentMessage('')

      try {
        const [paymentResult, clientResult, projectResult] = await Promise.all([
          supabase
            .from('payments')
            .select('id, client_id, project_id, amount, currency, payment_method, payment_status, payment_date, notes, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('clients')
            .select('id, client_name, email, phone, company_name, notes, created_at')
            .order('client_name', { ascending: true }),
          supabase
            .from('projects')
            .select('id, project_name, client_id, description, status, budget, start_date, due_date, created_at')
            .order('project_name', { ascending: true }),
        ])

        if (paymentResult.error) throw paymentResult.error
        if (clientResult.error) throw clientResult.error
        if (projectResult.error) throw projectResult.error

        if (!cancelled) {
          setPayments((paymentResult.data ?? []) as Payment[])
          setClients((clientResult.data ?? []) as Client[])
          setProjects((projectResult.data ?? []) as Project[])
        }
      } catch (error) {
        if (!cancelled) {
          setPaymentError(error instanceof Error ? error.message : 'Unable to load payments.')
        }
      } finally {
        if (!cancelled) {
          setPaymentsLoading(false)
          setClientsLoading(false)
        }
      }
    }

    void loadPayments()
    return () => { cancelled = true }
  }, [activeSection])
  const handleLogout = async () => {
    if (loggingOut || clientBusy || projectBusy || paymentBusy) return

    setLoggingOut(true)
    setLogoutError('')

    try {
      const { error } = await supabase.auth.signOut({
        scope: 'local',
      })

      if (error) {
        setLogoutError('Logout failed. Please try again.')
      }
    } catch {
      setLogoutError('Unable to log out. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  // Add a new client, or update the client currently being edited.
  const handleAddClient = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (formDisabled) return

    setClientError('')
    setClientMessage('')

    if (!clientName.trim()) {
      setClientError('Please enter a client name.')
      return
    }

    const clientId = editingClientId

    const details = {
      client_name: clientName.trim(),
      email: clientEmail.trim() || null,
      phone: clientPhone.trim() || null,
      company_name: companyName.trim() || null,
      notes: clientNotes.trim() || null,
    }

    setSavingClient(true)

    try {
      const query = clientId
        ? supabase
            .from('clients')
            .update(details)
            .eq('id', clientId)
        : supabase
            .from('clients')
            .insert(details)

      const { data, error } = await query
        .select(
          'id, client_name, email, phone, company_name, notes, created_at',
        )
        .single()

      if (error) {
        setClientError(error.message)
        return
      }

      if (!data) {
        setClientError(
          'No client record was returned. Please refresh and check.',
        )
        return
      }

      const savedClient = data as Client

      setClients((previous) =>
        clientId
          ? previous.map((client) =>
              client.id === clientId ? savedClient : client,
            )
          : [savedClient, ...previous],
      )

      resetClientForm()

      setClientMessage(
        clientId
          ? 'Client updated successfully.'
          : 'Client added successfully.',
      )
    } catch (error) {
      setClientError(
        error instanceof Error
          ? error.message
          : 'Unable to save client.',
      )
    } finally {
      setSavingClient(false)
    }
  }

  const handleDeleteClient = async (client: Client) => {
    if (formDisabled) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${client.client_name}?`,
    )

    if (!confirmed) return

    setDeletingClientId(client.id)
    setClientError('')
    setClientMessage('')

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      if (error) {
        setClientError(error.message)
        return
      }

      setClients((previous) =>
        previous.filter((item) => item.id !== client.id),
      )

      if (editingClientId === client.id) {
        resetClientForm()
      }

      setClientMessage('Client deleted successfully.')
    } catch (error) {
      setClientError(
        error instanceof Error
          ? error.message
          : 'Unable to delete client.',
      )
    } finally {
      setDeletingClientId(null)
    }
  }

  const resetProjectForm = () => {
    setEditingProjectId(null)
    setProjectName('')
    setProjectClientId('')
    setProjectDescription('')
    setProjectStatus('In Progress')
    setProjectBudget('')
    setProjectStartDate('')
    setProjectDueDate('')
  }

  const openDatePicker = (event: React.MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget as HTMLInputElement & {
      showPicker?: () => void
    }

    try {
      input.showPicker?.()
    } catch {
      // The browser can still open the calendar from the date input icon.
    }
  }

  const handleEditProject = (project: Project) => {
    if (projectFormDisabled) return

    setEditingProjectId(project.id)
    setProjectName(project.project_name)
    setProjectClientId(project.client_id ?? '')
    setProjectDescription(project.description ?? '')
    setProjectStatus(project.status)
    setProjectBudget(project.budget === null ? '' : String(project.budget))
    setProjectStartDate(project.start_date ?? '')
    setProjectDueDate(project.due_date ?? '')
    setProjectError('')
    setProjectMessage('')

    document.getElementById('project-name')?.focus()
  }

  const handleDeleteProject = async (project: Project) => {
    if (projectFormDisabled) return

    const confirmed = window.confirm(
      'Are you sure you want to delete the project "' + project.project_name + '"?',
    )

    if (!confirmed) return

    setDeletingProjectId(project.id)
    setProjectError('')
    setProjectMessage('')

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) {
        setProjectError(error.message)
        return
      }

      setProjects((previous) =>
        previous.filter((item) => item.id !== project.id),
      )

      if (editingProjectId === project.id) resetProjectForm()

      setProjectMessage('Project deleted successfully.')
    } catch (error) {
      setProjectError(
        error instanceof Error
          ? error.message
          : 'Unable to delete the project.',
      )
    } finally {
      setDeletingProjectId(null)
    }
  }

  // Add a new project, or update the project currently being edited.
  const handleAddProject = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (projectFormDisabled) return

    setProjectError('')
    setProjectMessage('')

    if (!projectName.trim()) {
      setProjectError('Please enter a project name.')
      return
    }

    const parsedBudget = projectBudget.trim()
      ? Number(projectBudget)
      : null

    if (
      parsedBudget !== null &&
      (!Number.isFinite(parsedBudget) || parsedBudget < 0)
    ) {
      setProjectError('Enter a valid budget of zero or more.')
      return
    }

    if (
      projectStartDate &&
      projectDueDate &&
      projectDueDate < projectStartDate
    ) {
      setProjectError(
        'Due date cannot be earlier than the start date.',
      )
      return
    }

    const projectId = editingProjectId
    const projectDetails = {
      project_name: projectName.trim(),
      client_id: projectClientId || null,
      description: projectDescription.trim() || null,
      status: projectStatus,
      budget: parsedBudget,
      start_date: projectStartDate || null,
      due_date: projectDueDate || null,
    }

    setSavingProject(true)

    try {
      const query = projectId
        ? supabase.from('projects').update(projectDetails).eq('id', projectId)
        : supabase.from('projects').insert(projectDetails)

      const { data, error } = await query
        .select(
          'id, project_name, client_id, description, status, budget, start_date, due_date, created_at',
        )
        .single()

      if (error) {
        setProjectError(error.message)
        return
      }

      if (!data) {
        setProjectError(
          'No project record was returned. Please refresh and check.',
        )
        return
      }

      const savedProject = data as Project

      setProjects((previous) =>
        projectId
          ? previous.map((project) =>
              project.id === projectId ? savedProject : project,
            )
          : [savedProject, ...previous],
      )

      resetProjectForm()
      setProjectMessage(
        projectId
          ? 'Project updated successfully.'
          : 'Project added successfully.',
      )
    } catch (error) {
      setProjectError(
        error instanceof Error
          ? error.message
          : 'Unable to save the project.',
      )
    } finally {
      setSavingProject(false)
    }
  }

  const resetPaymentForm = () => {
    setEditingPaymentId(null)
    setPaymentClientId('')
    setPaymentProjectId('')
    setPaymentAmount('')
    setPaymentCurrency('INR')
    setPaymentMethod('')
    setPaymentStatus('Pending')
    setPaymentDate('')
    setPaymentNotes('')
  }

  const handleEditPayment = (payment: Payment) => {
    if (paymentBusy || paymentsLoading || clientsLoading || loggingOut) return
    setEditingPaymentId(payment.id)
    setPaymentClientId(payment.client_id ?? '')
    setPaymentProjectId(payment.project_id ?? '')
    setPaymentAmount(String(payment.amount))
    setPaymentCurrency(payment.currency)
    setPaymentMethod(payment.payment_method ?? '')
    setPaymentStatus(payment.payment_status)
    setPaymentDate(payment.payment_date ?? '')
    setPaymentNotes(payment.notes ?? '')
    setPaymentError('')
    setPaymentMessage('')
    document.getElementById('payment-amount')?.focus()
  }

  const handleSavePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (paymentBusy || paymentsLoading || clientsLoading || loggingOut) return

    setPaymentError('')
    setPaymentMessage('')
    const parsedAmount = Number(paymentAmount)
    if (!paymentAmount.trim() || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setPaymentError('Please enter a valid amount of zero or more.')
      return
    }

    const paymentId = editingPaymentId
    const details = {
      client_id: paymentClientId || null,
      project_id: paymentProjectId || null,
      amount: parsedAmount,
      currency: paymentCurrency,
      payment_method: paymentMethod.trim() || null,
      payment_status: paymentStatus,
      payment_date: paymentDate || null,
      notes: paymentNotes.trim() || null,
    }

    setSavingPayment(true)
    try {
      const query = paymentId
        ? supabase.from('payments').update(details).eq('id', paymentId)
        : supabase.from('payments').insert(details)
      const { data, error } = await query
        .select('id, client_id, project_id, amount, currency, payment_method, payment_status, payment_date, notes, created_at')
        .single()

      if (error) {
        setPaymentError(error.message)
        return
      }
      if (!data) {
        setPaymentError('No payment record was returned. Please refresh and check.')
        return
      }

      const savedPayment = data as Payment
      setPayments((previous) =>
        paymentId
          ? previous.map((item) => item.id === paymentId ? savedPayment : item)
          : [savedPayment, ...previous],
      )
      resetPaymentForm()
      setPaymentMessage(paymentId ? 'Payment updated successfully.' : 'Payment added successfully.')
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to save the payment.')
    } finally {
      setSavingPayment(false)
    }
  }

  const handleDeletePayment = async (payment: Payment) => {
    if (paymentBusy || paymentsLoading || clientsLoading || loggingOut) return
    if (!window.confirm('Delete this payment record?')) return

    setDeletingPaymentId(payment.id)
    setPaymentError('')
    setPaymentMessage('')
    try {
      const { error } = await supabase.from('payments').delete().eq('id', payment.id)
      if (error) {
        setPaymentError(error.message)
        return
      }
      setPayments((previous) => previous.filter((item) => item.id !== payment.id))
      if (editingPaymentId === payment.id) resetPaymentForm()
      setPaymentMessage('Payment deleted successfully.')
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to delete the payment.')
    } finally {
      setDeletingPaymentId(null)
    }
  }
  const revenueValue = Object.entries(overviewStats.revenue)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount),
    )
    .join(' / ') || '₹0'

  const cards = [
    { title: 'Total Enquiries', value: overviewLoading ? '…' : String(overviewStats.enquiries), icon: '✉' },
    { title: 'Total Clients', value: overviewLoading ? '…' : String(overviewStats.clients), icon: '♛' },
    { title: 'Active Projects', value: overviewLoading ? '…' : String(overviewStats.activeProjects), icon: '◈' },
    { title: 'Total Revenue (Paid)', value: overviewLoading ? '…' : revenueValue, icon: '₹' },
  ]
  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#0C0B0A',
    color: '#F7F2E9',
    border: '1px solid #493A25',
    borderRadius: 8,
    padding: '12px 13px',
    outlineColor: gold,
    fontSize: 14,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#D8C9AE',
    fontSize: 13,
    marginBottom: 7,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#F7F2E9',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <style>{`
        .dp-admin-layout { display:flex; min-height:100vh; }
        .dp-admin-sidebar {
          width:255px; flex-shrink:0; background:#11100E;
          border-right:1px solid #302719; padding:25px 18px;
        }
        .dp-admin-main { flex:1; min-width:0; padding:35px; }
        .dp-admin-brand {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; margin-bottom:28px; padding-bottom:20px;
          border-bottom:1px solid #302719;
        }
        .dp-admin-logo {
          width:125px; height:100px; object-fit:contain; display:block;
        }
        .dp-admin-brand-name {
          font-size:9px; letter-spacing:2.5px; color:#B9A47E;
          margin-top:2px; text-align:center;
        }
        .dp-admin-nav {
          width:100%; display:flex; align-items:center; padding:14px 16px;
          margin-bottom:6px; background:transparent; color:#B6B0A5;
          border:1px solid transparent; border-radius:10px; cursor:pointer;
          text-align:left; font-size:14px; transition:background .2s,color .2s;
        }
        .dp-admin-nav.active {
          background:#2A2116; color:#D7B477; border-color:#554126;
        }
        .dp-admin-nav:hover { color:#D7B477; }
        .dp-admin-nav:disabled { opacity:.6; cursor:wait; }
        .dp-admin-cards {
          display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px;
        }
        .dp-admin-card {
          background:#151310; border:1px solid #3B3021;
          border-radius:16px; padding:24px; min-width:0;
        }
        .dp-admin-menu-button { display:none; }
        .dp-admin-logout {
          border:1px solid #755B36; border-radius:9px; padding:11px 18px;
          background:#201910; color:#E4C78F; cursor:pointer; font-size:12px;
          font-weight:600; letter-spacing:1px; transition:background .2s;
        }
        .dp-admin-logout:hover { background:#352717; }
        .dp-admin-logout:disabled { opacity:.6; cursor:wait; }
        .dp-admin-primary {
          border:1px solid #9B7845; border-radius:8px; padding:12px 18px;
          background:#D7B477; color:#17110A; font-weight:700; cursor:pointer;
        }
        .dp-admin-primary:disabled { opacity:.6; cursor:wait; }
        .dp-admin-table-wrap { width:100%; overflow-x:auto; }
        .dp-admin-table {
          width:100%; border-collapse:collapse; min-width:560px; font-size:13px;
        }
        .dp-admin-table th {
          color:#D7B477; text-align:left; font-weight:600;
          border-bottom:1px solid #493A25; padding:13px 10px;
        }
        .dp-admin-table td {
          color:#D8D0C4; border-bottom:1px solid #302719;
          padding:14px 10px; overflow-wrap:anywhere;
        }
        .dp-admin-delete {
          color:#F0C7A7; background:#2A1712; border:1px solid #704536;
          border-radius:7px; padding:8px 10px; cursor:pointer;
        }
        .dp-admin-delete:disabled { opacity:.6; cursor:wait; }
        @media(max-width:1050px) {
          .dp-admin-cards { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media(max-width:700px) {
          .dp-admin-layout { display:block; }
          .dp-admin-sidebar { width:auto; padding:18px; }
          .dp-admin-sidebar.collapsed .dp-admin-navigation { display:none; }
          .dp-admin-brand { margin-bottom:14px; padding-bottom:12px; }
          .dp-admin-logo { width:110px; height:85px; }
          .dp-admin-main { padding:22px 16px; }
          .dp-admin-menu-button { display:inline-block; }
          .dp-admin-cards { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="dp-admin-layout">
        <aside className={`dp-admin-sidebar ${menuOpen ? '' : 'collapsed'}`}>
          <div style={{ position: 'relative' }}>
            <div className="dp-admin-brand">
              <img
                src="/dp-logo.png"
                alt="Durga Prasad Creative Studio Logo"
                className="dp-admin-logo"
              />
              <div className="dp-admin-brand-name">
                CREATIVE STUDIO
              </div>
            </div>

            <button
              type="button"
              className="dp-admin-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              style={{
                position: 'absolute',
                top: 10,
                right: 0,
                background: 'transparent',
                color: gold,
                border: `1px solid ${gold}`,
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              ☰
            </button>
          </div>

          <nav className="dp-admin-navigation">
            {sections.map((section) => (
              <button
                key={section}
                type="button"
                className={`dp-admin-nav ${
                  activeSection === section ? 'active' : ''
                }`}
                disabled={clientBusy || projectBusy || paymentBusy || loggingOut}
                onClick={() => {
                  if (section !== activeSection) {
                    resetClientForm()
                    setClientError('')
                    setClientMessage('')
                    setProjectError('')
                    setProjectMessage('')
                  }

                  setActiveSection(section)
                  setMenuOpen(false)
                }}
              >
                {section}
              </button>
            ))}
          </nav>

          <div
            style={{
              marginTop: 35,
              padding: 16,
              borderTop: '1px solid #302719',
              color: '#8E877D',
              fontSize: 11,
              lineHeight: 1.8,
            }}
          >
            PRIVATE ADMIN AREA
            <div>DP Creative Studio</div>
          </div>
        </aside>

        <main className="dp-admin-main">
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 15,
              marginBottom: 40,
            }}
          >
            <div>
              <div
                style={{
                  color: gold,
                  fontSize: 11,
                  letterSpacing: 3,
                  marginBottom: 10,
                }}
              >
                DP CREATIVE STUDIO
              </div>

              <h1
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 'clamp(27px, 4vw, 39px)',
                  margin: 0,
                }}
              >
                {activeSection}
                <span style={{ color: gold }}>.</span>
              </h1>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div
                style={{
                  border: '1px solid #493A25',
                  borderRadius: 30,
                  padding: '12px 18px',
                  color: gold,
                  fontSize: 12,
                }}
              >
                ● Admin Workspace
              </div>

              <button
                className="dp-admin-logout"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut || clientBusy || projectBusy}
              >
                {loggingOut ? 'LOGGING OUT...' : 'LOG OUT →'}
              </button>
            </div>
          </header>

          {logoutError && (
            <p role="alert" style={{ color: '#E4C78F', fontSize: 13 }}>
              {logoutError}
            </p>
          )}

          {activeSection === 'Overview' ? (
            <>
              <p
                style={{
                  color: '#AFA79C',
                  marginBottom: 30,
                  lineHeight: 1.7,
                }}
              >
                Welcome to your creative business workspace. Manage enquiries,
                clients, projects, payments, and receipts in one place.
              </p>

              <div className="dp-admin-cards">
                {cards.map((card) => (
                  <div className="dp-admin-card" key={card.title}>
                    <div style={{ color: gold, fontSize: 26, marginBottom: 22 }}>
                      {card.icon}
                    </div>

                    <div
                      style={{
                        color: '#B7AFA3',
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      {card.title}
                    </div>

                    <div
                      style={{
                        color: '#F5E4C7',
                        fontSize: 30,
                        fontWeight: 600,
                      }}
                    >
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {overviewError && (
                <div role="alert" style={{ color: '#FFC3AE', background: '#281611', border: '1px solid #704536', borderRadius: 9, padding: 14, marginTop: 20, overflowWrap: 'anywhere', fontSize: 13 }}>
                  Could not load Overview data: {overviewError}
                </div>
              )}

              <div className="dp-admin-card" style={{ marginTop: 25 }}>
                <h2 style={{ color: gold, fontFamily: 'Georgia, serif', fontSize: 21 }}>
                  Recent Activity
                </h2>
                {overviewLoading ? (
                  <p style={{ color: '#AFA79C', fontSize: 14 }}>Loading recent activity...</p>
                ) : recentActivity.length === 0 ? (
                  <p style={{ color: '#AFA79C', fontSize: 14, lineHeight: 1.8 }}>
                    No recent activity yet. New enquiries, clients, and projects will appear here.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {recentActivity.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, paddingBottom: 12, borderBottom: '1px solid #302719' }}>
                        <span style={{ color: '#D8D0C4', fontSize: 14 }}>{item.message}</span>
                        <time dateTime={item.created_at} style={{ color: '#948B7F', fontSize: 12 }}>
                          {new Date(item.created_at).toLocaleString()}
                        </time>
                      </div>
                    ))}
                  </div>
                )}
              </div>            </>
          ) : activeSection === 'Enquiries' ? (
            <EnquiriesSection />
          ) : activeSection === 'Clients' ? (
            <>
              <section className="dp-admin-card" style={{ marginBottom: 22 }}>
                <h2
                  style={{
                    color: gold,
                    fontFamily: 'Georgia, serif',
                    fontSize: 23,
                    marginTop: 0,
                  }}
                >
                  {editingClientId ? 'Edit Client' : 'Add New Client'}
                </h2>

                <p style={{ color: '#AFA79C', fontSize: 13, lineHeight: 1.7 }}>
                  {editingClientId
                    ? 'Update the client details below, then save your changes.'
                    : 'Client details will be securely saved to the database. Only the client name is required.'}
                </p>

                <form onSubmit={handleAddClient}>
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
                      <label style={labelStyle} htmlFor="client-name">
                        Client Name *
                      </label>

                      <input
                        id="client-name"
                        style={inputStyle}
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                        placeholder="Enter client name"
                        required
                        maxLength={150}
                        disabled={formDisabled}
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="client-email">
                        Email
                      </label>

                      <input
                        id="client-email"
                        type="email"
                        style={inputStyle}
                        value={clientEmail}
                        onChange={(event) => setClientEmail(event.target.value)}
                        placeholder="client@example.com"
                        maxLength={254}
                        disabled={formDisabled}
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="client-phone">
                        Phone
                      </label>

                      <input
                        id="client-phone"
                        type="tel"
                        style={inputStyle}
                        value={clientPhone}
                        onChange={(event) => setClientPhone(event.target.value)}
                        placeholder="Phone number"
                        maxLength={30}
                        disabled={formDisabled}
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="client-company">
                        Company Name
                      </label>

                      <input
                        id="client-company"
                        style={inputStyle}
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        placeholder="Company (optional)"
                        maxLength={150}
                        disabled={formDisabled}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle} htmlFor="client-notes">
                        Notes
                      </label>

                      <textarea
                        id="client-notes"
                        style={{
                          ...inputStyle,
                          minHeight: 90,
                          resize: 'vertical',
                        }}
                        value={clientNotes}
                        onChange={(event) => setClientNotes(event.target.value)}
                        placeholder="Additional client details..."
                        maxLength={2000}
                        disabled={formDisabled}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginTop: 20,
                    }}
                  >
                    <button
                      className="dp-admin-primary"
                      type="submit"
                      disabled={formDisabled}
                    >
                      {savingClient
                        ? 'SAVING CLIENT...'
                        : editingClientId
                          ? 'SAVE CHANGES'
                          : '+ ADD CLIENT'}
                    </button>

                    {editingClientId && (
                      <button
                        className="dp-admin-logout"
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={formDisabled}
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {clientError && (
                <div
                  role="alert"
                  style={{
                    color: '#FFC3AE',
                    background: '#281611',
                    border: '1px solid #704536',
                    borderRadius: 9,
                    padding: 14,
                    marginBottom: 18,
                    overflowWrap: 'anywhere',
                    fontSize: 13,
                  }}
                >
                  {clientError}
                </div>
              )}

              {clientMessage && (
                <div
                  role="status"
                  style={{
                    color: '#D7B477',
                    background: '#201910',
                    border: '1px solid #493A25',
                    borderRadius: 9,
                    padding: 14,
                    marginBottom: 18,
                    fontSize: 13,
                  }}
                >
                  {clientMessage}
                </div>
              )}

              <section className="dp-admin-card">
                <h2
                  style={{
                    color: gold,
                    fontFamily: 'Georgia, serif',
                    fontSize: 23,
                    marginTop: 0,
                  }}
                >
                  Clients List ({clients.length})
                </h2>

                {clientsLoading ? (
                  <p style={{ color: '#AFA79C' }}>Loading clients...</p>
                ) : clientError && clients.length === 0 ? (
                  <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>
                    Unable to load the clients list. Please check the error above.
                  </p>
                ) : clients.length === 0 ? (
                  <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>
                    No clients have been added yet. Use the form above to add
                    your first client.
                  </p>
                ) : (
                  <div className="dp-admin-table-wrap">
                    <table className="dp-admin-table">
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Contact</th>
                          <th>Company</th>
                          <th>Added</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {clients.map((client) => (
                          <tr key={client.id}>
                            <td>
                              <strong style={{ color: '#F5E4C7' }}>
                                {client.client_name}
                              </strong>

                              {client.notes && (
                                <div
                                  style={{
                                    color: '#948B7F',
                                    marginTop: 5,
                                    maxWidth: 230,
                                  }}
                                >
                                  {client.notes}
                                </div>
                              )}
                            </td>

                            <td>
                              {client.email || '—'}

                              {client.phone && (
                                <div style={{ marginTop: 5 }}>
                                  {client.phone}
                                </div>
                              )}
                            </td>

                            <td>{client.company_name || '—'}</td>

                            <td>
                              {client.created_at
                                ? new Date(client.created_at).toLocaleDateString()
                                : '—'}
                            </td>

                            <td>
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 8,
                                }}
                              >
                                <button
                                  type="button"
                                  className="dp-admin-logout"
                                  style={{
                                    padding: '8px 10px',
                                    fontSize: 13,
                                    letterSpacing: 0,
                                  }}
                                  disabled={formDisabled}
                                  onClick={() => handleEditClient(client)}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="dp-admin-delete"
                                  disabled={formDisabled}
                                  onClick={() => void handleDeleteClient(client)}
                                >
                                  {deletingClientId === client.id
                                    ? 'Deleting...'
                                    : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : activeSection === 'Projects' ? (
            <>
              <section className="dp-admin-card" style={{ marginBottom: 22 }}>
                <h2
                  style={{
                    color: gold,
                    fontFamily: 'Georgia, serif',
                    fontSize: 23,
                    marginTop: 0,
                  }}
                >
                  {editingProjectId ? 'Edit Project' : 'Add New Project'}
                </h2>

                <p style={{ color: '#AFA79C', fontSize: 13, lineHeight: 1.7 }}>
                  {editingProjectId
                    ? 'Update the project details, then save your changes.'
                    : 'Add project details and optionally link the project to a client.'}
                </p>

                <form onSubmit={handleAddProject}>
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
                        onChange={(event) =>
                          setProjectName(event.target.value)
                        }
                        placeholder="Enter project name"
                        maxLength={200}
                        required
                        disabled={projectFormDisabled}
                      />
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="project-client">
                        Client
                      </label>
                      <select
                        id="project-client"
                        style={inputStyle}
                        value={projectClientId}
                        onChange={(event) =>
                          setProjectClientId(event.target.value)
                        }
                        disabled={projectFormDisabled}
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
                        value={projectStatus}
                        onChange={(event) =>
                          setProjectStatus(
                            event.target.value as ProjectStatus,
                          )
                        }
                        disabled={projectFormDisabled}
                      >
                        {projectStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
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
                        value={projectBudget}
                        onChange={(event) =>
                          setProjectBudget(event.target.value)
                        }
                        placeholder="Optional amount"
                        disabled={projectFormDisabled}
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
                        value={projectStartDate}
                        onClick={openDatePicker}
                        onChange={(event) =>
                          setProjectStartDate(event.target.value)
                        }
                        disabled={projectFormDisabled}
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
                        value={projectDueDate}
                        min={projectStartDate || undefined}
                        onClick={openDatePicker}
                        onChange={(event) =>
                          setProjectDueDate(event.target.value)
                        }
                        disabled={projectFormDisabled}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label
                        style={labelStyle}
                        htmlFor="project-description"
                      >
                        Description
                      </label>
                      <textarea
                        id="project-description"
                        style={{
                          ...inputStyle,
                          minHeight: 90,
                          resize: 'vertical',
                        }}
                        value={projectDescription}
                        onChange={(event) =>
                          setProjectDescription(event.target.value)
                        }
                        placeholder="Project details..."
                        maxLength={3000}
                        disabled={projectFormDisabled}
                      />
                    </div>
                  </div>

                  <button
                    className="dp-admin-primary"
                    type="submit"
                    disabled={projectFormDisabled}
                    style={{ marginTop: 20 }}
                  >
                    {savingProject
                      ? editingProjectId
                        ? 'SAVING CHANGES...'
                        : 'SAVING PROJECT...'
                      : editingProjectId
                        ? 'SAVE CHANGES'
                        : '+ ADD PROJECT'}
                  </button>

                  {editingProjectId && (
                    <button
                      className="dp-admin-logout"
                      type="button"
                      onClick={resetProjectForm}
                      disabled={projectFormDisabled}
                      style={{ marginTop: 20, marginLeft: 10 }}
                    >
                      CANCEL
                    </button>
                  )}
                </form>
              </section>

              {projectError && (
                <div
                  role="alert"
                  style={{
                    color: '#FFC3AE',
                    background: '#281611',
                    border: '1px solid #704536',
                    borderRadius: 9,
                    padding: 14,
                    marginBottom: 18,
                    overflowWrap: 'anywhere',
                    fontSize: 13,
                  }}
                >
                  {projectError}
                </div>
              )}

              {projectMessage && (
                <div
                  role="status"
                  style={{
                    color: '#D7B477',
                    background: '#201910',
                    border: '1px solid #493A25',
                    borderRadius: 9,
                    padding: 14,
                    marginBottom: 18,
                    fontSize: 13,
                  }}
                >
                  {projectMessage}
                </div>
              )}

              <section className="dp-admin-card">
                <h2
                  style={{
                    color: gold,
                    fontFamily: 'Georgia, serif',
                    fontSize: 23,
                    marginTop: 0,
                  }}
                >
                  Projects List ({projects.length})
                </h2>

                {projectsLoading ? (
                  <p style={{ color: '#AFA79C' }}>Loading projects...</p>
                ) : projectError && projects.length === 0 ? (
                  <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>
                    Unable to load projects. Please check the error above.
                  </p>
                ) : projects.length === 0 ? (
                  <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>
                    No projects have been added yet.
                  </p>
                ) : (
                  <div className="dp-admin-table-wrap">
                    <table
                      className="dp-admin-table"
                      style={{ minWidth: 900 }}
                    >
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Client</th>
                          <th>Status</th>
                          <th>Budget</th>
                          <th>Start Date</th>
                          <th>Due Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {projects.map((project) => {
                          const client = clients.find(
                            (item) => item.id === project.client_id,
                          )

                          return (
                            <tr key={project.id}>
                              <td>
                                <strong style={{ color: '#F5E4C7' }}>
                                  {project.project_name}
                                </strong>

                                {project.description && (
                                  <div
                                    style={{
                                      color: '#948B7F',
                                      marginTop: 5,
                                      maxWidth: 260,
                                    }}
                                  >
                                    {project.description}
                                  </div>
                                )}
                              </td>

                              <td>{client?.client_name || '—'}</td>
                              <td>{project.status}</td>

                              <td>
                                {project.budget === null
                                  ? '—'
                                  : `₹${Number(project.budget).toLocaleString('en-IN')}`}
                              </td>

                              <td>{project.start_date || '—'}</td>
                              <td>{project.due_date || '—'}</td>
                              <td>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="dp-admin-logout"
                                    style={{
                                      padding: '8px 10px',
                                      fontSize: 13,
                                      letterSpacing: 0,
                                    }}
                                    disabled={projectFormDisabled}
                                    onClick={() => handleEditProject(project)}
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="dp-admin-delete"
                                    disabled={projectFormDisabled}
                                    onClick={() => void handleDeleteProject(project)}
                                  >
                                    {deletingProjectId === project.id
                                      ? 'Deleting...'
                                      : 'Delete'}
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
            </>
          ) : activeSection === 'Receipts' ? (
            <ReceiptsSection />          ) : activeSection === 'Payments' ? (
            <>
              <section className="dp-admin-card" style={{ marginBottom: 22 }}>
                <h2 style={{ color: gold, fontFamily: 'Georgia, serif', fontSize: 23, marginTop: 0 }}>
                  {editingPaymentId ? 'Edit Payment' : 'Add Payment'}
                </h2>
                <p style={{ color: '#AFA79C', fontSize: 13, lineHeight: 1.7 }}>
                  Record payments received or expected from clients. Only amount is required.
                </p>
                <form onSubmit={handleSavePayment}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 16, marginTop: 22 }}>
                    <div>
                      <label style={labelStyle} htmlFor="payment-client">Client</label>
                      <select id="payment-client" style={inputStyle} value={paymentClientId} disabled={paymentBusy || paymentsLoading || clientsLoading || loggingOut}
                        onChange={(event) => {
                          const nextClientId = event.target.value
                          setPaymentClientId(nextClientId)
                          const chosenProject = projects.find((item) => item.id === paymentProjectId)
                          if (chosenProject && nextClientId && chosenProject.client_id !== nextClientId) setPaymentProjectId('')
                        }}>
                        <option value="">No client selected</option>
                        {clients.map((client) => <option key={client.id} value={client.id}>{client.client_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="payment-project">Project</label>
                      <select id="payment-project" style={inputStyle} value={paymentProjectId} disabled={paymentBusy || paymentsLoading || loggingOut}
                        onChange={(event) => setPaymentProjectId(event.target.value)}>
                        <option value="">No project selected</option>
                        {projects.filter((project) => !paymentClientId || project.client_id === paymentClientId).map((project) => (
                          <option key={project.id} value={project.id}>{project.project_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="payment-amount">Amount *</label>
                      <input id="payment-amount" type="number" min="0" step="0.01" style={inputStyle} value={paymentAmount}
                        onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Enter amount" required disabled={paymentBusy || paymentsLoading || loggingOut} />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="payment-currency">Currency</label>
                      <select id="payment-currency" style={inputStyle} value={paymentCurrency} onChange={(event) => setPaymentCurrency(event.target.value as 'INR' | 'USD')} disabled={paymentBusy || loggingOut}>
                        <option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="payment-method">Payment Method</label>
                      <input id="payment-method" style={inputStyle} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="UPI, cash, bank transfer..." maxLength={100} disabled={paymentBusy || loggingOut} />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="payment-status">Status</label>
                      <select id="payment-status" style={inputStyle} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)} disabled={paymentBusy || loggingOut}>
                        {(['Pending', 'Paid', 'Failed', 'Refunded'] as PaymentStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="payment-date">Payment Date</label>
                      <input id="payment-date" type="date" style={inputStyle} value={paymentDate} onClick={openDatePicker} onChange={(event) => setPaymentDate(event.target.value)} disabled={paymentBusy || loggingOut} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle} htmlFor="payment-notes">Notes</label>
                      <textarea id="payment-notes" style={{ ...inputStyle, minHeight: 85, resize: 'vertical' }} value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} placeholder="Optional payment details..." maxLength={2000} disabled={paymentBusy || loggingOut} />
                    </div>
                  </div>
                  <button className="dp-admin-primary" type="submit" disabled={paymentBusy || paymentsLoading || clientsLoading || loggingOut} style={{ marginTop: 20 }}>
                    {savingPayment ? 'SAVING PAYMENT...' : editingPaymentId ? 'SAVE CHANGES' : '+ ADD PAYMENT'}
                  </button>
                  {editingPaymentId && <button className="dp-admin-logout" type="button" onClick={resetPaymentForm} disabled={paymentBusy} style={{ marginTop: 20, marginLeft: 10 }}>CANCEL</button>}
                </form>
              </section>

              {paymentError && <div role="alert" style={{ color: '#FFC3AE', background: '#281611', border: '1px solid #704536', borderRadius: 9, padding: 14, marginBottom: 18, overflowWrap: 'anywhere', fontSize: 13 }}>{paymentError}</div>}
              {paymentMessage && <div role="status" style={{ color: '#D7B477', background: '#201910', border: '1px solid #493A25', borderRadius: 9, padding: 14, marginBottom: 18, fontSize: 13 }}>{paymentMessage}</div>}

              <section className="dp-admin-card">
                <h2 style={{ color: gold, fontFamily: 'Georgia, serif', fontSize: 23, marginTop: 0 }}>Payments List ({payments.length})</h2>
                {paymentsLoading ? <p style={{ color: '#AFA79C' }}>Loading payments...</p> : paymentError && payments.length === 0 ? <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>Unable to load payments. Please check the error above.</p> : payments.length === 0 ? <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>No payments have been recorded yet.</p> : (
                  <div className="dp-admin-table-wrap">
                    <table className="dp-admin-table" style={{ minWidth: 900 }}>
                      <thead><tr><th>Client / Project</th><th>Amount</th><th>Method</th><th>Status</th><th>Payment Date</th><th>Notes</th><th>Actions</th></tr></thead>
                      <tbody>{payments.map((payment) => {
                        const client = clients.find((item) => item.id === payment.client_id)
                        const project = projects.find((item) => item.id === payment.project_id)
                        return <tr key={payment.id}>
                          <td><strong style={{ color: '#F5E4C7' }}>{client?.client_name || '—'}</strong>{project && <div style={{ color: '#948B7F', marginTop: 5 }}>{project.project_name}</div>}</td>
                          <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency, maximumFractionDigits: 2 }).format(Number(payment.amount))}</td>
                          <td>{payment.payment_method || '—'}</td>
                          <td><span style={{ color: payment.payment_status === 'Paid' ? '#9BD7A7' : payment.payment_status === 'Failed' ? '#FFC3AE' : '#E4C78F' }}>{payment.payment_status}</span></td>
                          <td>{payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : '—'}</td>
                          <td>{payment.notes || '—'}</td>
                          <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <button type="button" className="dp-admin-logout" style={{ padding: '8px 10px', fontSize: 13, letterSpacing: 0 }} disabled={paymentBusy || paymentsLoading} onClick={() => handleEditPayment(payment)}>Edit</button>
                            <button type="button" className="dp-admin-delete" disabled={paymentBusy || paymentsLoading} onClick={() => void handleDeletePayment(payment)}>{deletingPaymentId === payment.id ? 'Deleting...' : 'Delete'}</button>
                          </div></td>
                        </tr>
                      })}</tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : activeSection === 'Settings' ? (
            <SettingsSection />
          ) : (
            <div className="dp-admin-card">
              <h2
                style={{
                  color: gold,
                  fontFamily: 'Georgia, serif',
                  fontSize: 23,
                }}
              >
                {activeSection}
              </h2>

              <p
                style={{
                  color: '#AFA79C',
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                This section is ready for the next development stage. Secure
                data management features will be added here.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
