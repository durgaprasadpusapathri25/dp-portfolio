import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

type Payment = {
  id: string
  client_id: string | null
  project_id: string | null
  amount: number
  currency: 'INR' | 'USD'
  payment_method: string | null
  payment_status: 'Pending' | 'Paid' | 'Failed' | 'Refunded'
  payment_date: string | null
  notes: string | null
  created_at: string
}

type Client = {
  id: string
  client_name: string
  email: string | null
  phone: string | null
}

type Project = {
  id: string
  project_name: string
  client_id: string | null
  budget: number | null
}

type Receipt = {
  id: string
  receipt_number: string
  client_id: string | null
  payment_id: string | null
  amount: number
  currency: 'INR' | 'USD'
  issue_date: string
  description: string | null
  created_at: string
}

const gold = '#D7B477'
const panel = '#151310'
const border = '#493A25'

function todayAsDateInput() {
  const today = new Date()
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function money(amount: number, currency: 'INR' | 'USD') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

export default function ReceiptsSection() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [clientId, setClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR')
  const [issueDate, setIssueDate] = useState(todayAsDateInput())
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<Receipt | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadReceiptData() {
      setLoading(true)
      setError('')

      try {
        const [receiptResult, paymentResult, clientResult, projectResult] =
          await Promise.all([
            supabase
              .from('receipts')
              .select('id, receipt_number, client_id, payment_id, amount, currency, issue_date, description, created_at')
              .order('created_at', { ascending: false }),
            supabase
              .from('payments')
              .select('id, client_id, project_id, amount, currency, payment_method, payment_status, payment_date, notes, created_at')
              .eq('payment_status', 'Paid')
              .order('created_at', { ascending: false }),
            supabase
              .from('clients')
              .select('id, client_name, email, phone')
              .order('client_name', { ascending: true }),
            supabase
              .from('projects')
              .select('id, project_name, client_id, budget')
              .order('project_name', { ascending: true }),
          ])

        const failed = [receiptResult, paymentResult, clientResult, projectResult].find(
          (result) => result.error,
        )
        if (failed?.error) throw failed.error

        if (!cancelled) {
          setReceipts((receiptResult.data ?? []) as Receipt[])
          setPayments((paymentResult.data ?? []) as Payment[])
          setClients((clientResult.data ?? []) as Client[])
          setProjects((projectResult.data ?? []) as Project[])
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load receipts.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReceiptData()
    return () => {
      cancelled = true
    }
  }, [])

  const availablePayments = payments.filter(
    (payment) => !receipts.some((receipt) => receipt.payment_id === payment.id),
  )

  const selectedPayment = payments.find((payment) => payment.id === paymentId)
  const selectedClient = clients.find((client) => client.id === clientId)
  const selectedProject = projects.find(
    (project) => project.id === selectedPayment?.project_id,
  )

  const resetForm = () => {
    setPaymentId('')
    setClientId('')
    setAmount('')
    setCurrency('INR')
    setIssueDate(todayAsDateInput())
    setDescription('')
  }

  const handlePaymentChange = (nextPaymentId: string) => {
    setPaymentId(nextPaymentId)
    const payment = payments.find((item) => item.id === nextPaymentId)
    if (!payment) {
      setClientId('')
      setAmount('')
      setCurrency('INR')
      setDescription('')
      return
    }

    const project = projects.find((item) => item.id === payment.project_id)
    setClientId(payment.client_id ?? '')
    setAmount(String(payment.amount))
    setCurrency(payment.currency)
    setIssueDate(payment.payment_date || todayAsDateInput())
    setDescription(project ? `Payment received for ${project.project_name}` : 'Payment received')
  }

  const handleCreateReceipt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || loading) return

    setError('')
    setMessage('')

    const payment = payments.find((item) => item.id === paymentId)
    if (!payment) {
      setError('Choose a paid payment to create a receipt.')
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid amount of zero or more.')
      return
    }

    const receiptNumber = `DP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const details = {
      receipt_number: receiptNumber,
      client_id: clientId || null,
      payment_id: payment.id,
      amount: parsedAmount,
      currency,
      issue_date: issueDate || todayAsDateInput(),
      description: description.trim() || null,
    }

    setSaving(true)
    try {
      const { data, error: insertError } = await supabase
        .from('receipts')
        .insert(details)
        .select('id, receipt_number, client_id, payment_id, amount, currency, issue_date, description, created_at')
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('The receipt was not returned after saving.')

      const savedReceipt = data as Receipt
      setReceipts((previous) => [savedReceipt, ...previous])
      setPreview(savedReceipt)
      resetForm()

      const receiptClient = clients.find((client) => client.id === savedReceipt.client_id)
      if (!receiptClient?.email) {
        setMessage(`Receipt ${savedReceipt.receipt_number} created. Add an email address to this client record to send it automatically.`)
      } else {
        const { error: emailError } = await supabase.functions.invoke('send-receipt-email', {
          body: { receipt_id: savedReceipt.id },
        })
        if (emailError) {
          setMessage(`Receipt ${savedReceipt.receipt_number} created, but the automatic email could not be sent.`)
          setError(emailError.message)
        } else {
          setMessage(`Receipt ${savedReceipt.receipt_number} created and emailed to ${receiptClient.email}.`)
        }
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to create receipt.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = (receipt: Receipt) => {
    setPreview(receipt)

    // Wait for React to render the selected receipt before opening print preview.
    window.setTimeout(() => {
      const printRoot = document.getElementById('dp-receipt-print')
      const images = Array.from(printRoot?.querySelectorAll('img') ?? [])
      const imageLoads = images.map((image) => {
        if (image.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => resolve(), { once: true })
        })
      })

      void Promise.all(imageLoads).then(() => {
        window.requestAnimationFrame(() => window.print())
      })
    }, 200)
  }

  const getWhatsAppLink = (receipt: Receipt) => {
    const client = clients.find((item) => item.id === receipt.client_id)
    const rawPhone = (client?.phone ?? '').replace(/\D/g, '')
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone
    if (!phone) return ''

    const payment = payments.find((item) => item.id === receipt.payment_id)
    const project = projects.find((item) => item.id === payment?.project_id)
    const text = [
      `Hi ${client?.client_name || 'there'}, thank you for your payment to DP Creative Studio.`,
      `Receipt: ${receipt.receipt_number}`,
      `Amount: ${money(Number(receipt.amount), receipt.currency)}`,
      `Date: ${receipt.issue_date}`,
      project ? `Project: ${project.project_name}` : '',
      'Your payment receipt is ready. I will share the receipt with you here.',
    ]
      .filter(Boolean)
      .join('\n')

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 13px',
    border: `1px solid ${border}`,
    borderRadius: 8,
    background: '#0C0B0A',
    color: '#F7F2E9',
    fontSize: 14,
    outlineColor: gold,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#D8C9AE',
    fontSize: 13,
    marginBottom: 7,
  }

  const previewClient = preview
    ? clients.find((client) => client.id === preview.client_id)
    : undefined
  const previewPayment = preview
    ? payments.find((payment) => payment.id === preview.payment_id)
    : undefined
  const previewProject = projects.find(
    (project) => project.id === previewPayment?.project_id,
  )
  const previewProjectBudget =
    previewProject?.budget === null || previewProject?.budget === undefined
      ? null
      : Number(previewProject.budget)
  const previewPaidToDate = previewProject
    ? payments
        .filter((payment) => payment.project_id === previewProject.id)
        .reduce((total, payment) => total + Number(payment.amount || 0), 0)
    : Number(preview?.amount || 0)
  const previewBalanceDue =
    previewProjectBudget === null
      ? null
      : Math.max(previewProjectBudget - previewPaidToDate, 0)

  return (
    <div>
      <style>{`
        .dp-receipt-card { background:${panel}; border:1px solid #3B3021; border-radius:16px; padding:24px; }
        .dp-receipt-actions { display:flex; flex-wrap:wrap; gap:8px; }
        .dp-receipt-table { width:100%; border-collapse:collapse; min-width:850px; font-size:13px; }
        .dp-receipt-table th { color:${gold}; text-align:left; border-bottom:1px solid ${border}; padding:13px 10px; }
        .dp-receipt-table td { color:#D8D0C4; border-bottom:1px solid #302719; padding:14px 10px; }
        .dp-receipt-preview { max-width:760px; margin:24px auto; padding:42px; background:#fffdf8; color:#211b12; border:1px solid #d5c39f; border-radius:12px; box-shadow:0 18px 55px rgba(0,0,0,.25); }
        .dp-receipt-gold { color:#9b7237; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { width:100% !important; margin:0 !important; padding:0 !important; background:#fff !important; }
          body * { visibility:hidden !important; }
          #dp-receipt-print, #dp-receipt-print * { visibility:visible !important; }
          #dp-receipt-print { display:block !important; position:fixed; left:0; top:0; width:100%; max-width:none; box-sizing:border-box; margin:0; padding:14mm; border:0; border-radius:0; box-shadow:none; background:#fffdf8 !important; color:#211b12 !important; }
          #dp-receipt-print > div { width:100%; box-sizing:border-box; border-radius:0 !important; box-shadow:none !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
          .dp-receipt-no-print { display:none !important; }
        }
      `}</style>

      <section className="dp-receipt-card" style={{ marginBottom: 22 }}>
        <h2 style={{ color: gold, fontFamily: 'Georgia, serif', fontSize: 23, marginTop: 0 }}>
          Create a Receipt
        </h2>
        <p style={{ color: '#AFA79C', fontSize: 13, lineHeight: 1.7 }}>
          Choose a paid payment. The client, amount, currency, and project details fill automatically.
        </p>

        {loading ? (
          <p style={{ color: '#AFA79C' }}>Loading paid payments...</p>
        ) : availablePayments.length === 0 ? (
          <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>
            No unreceipted paid payments are available. Add or mark a payment as Paid in Payments first.
          </p>
        ) : (
          <form onSubmit={handleCreateReceipt}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 16, marginTop: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle} htmlFor="receipt-payment">Paid Payment *</label>
                <select id="receipt-payment" style={inputStyle} value={paymentId} onChange={(event) => handlePaymentChange(event.target.value)} required disabled={saving}>
                  <option value="">Select a paid payment</option>
                  {availablePayments.map((payment) => {
                    const client = clients.find((item) => item.id === payment.client_id)
                    const project = projects.find((item) => item.id === payment.project_id)
                    return <option key={payment.id} value={payment.id}>
                      {client?.client_name || 'Client'}{project ? ` — ${project.project_name}` : ''} — {money(Number(payment.amount), payment.currency)}
                    </option>
                  })}
                </select>
              </div>

              <div>
                <label style={labelStyle} htmlFor="receipt-amount">Amount</label>
                <input id="receipt-amount" style={inputStyle} type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={!paymentId || saving} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="receipt-currency">Currency</label>
                <select id="receipt-currency" style={inputStyle} value={currency} onChange={(event) => setCurrency(event.target.value as 'INR' | 'USD')} disabled={!paymentId || saving}>
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="receipt-date">Issue Date</label>
                <input id="receipt-date" style={inputStyle} type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} disabled={saving} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle} htmlFor="receipt-description">Description</label>
                <textarea id="receipt-description" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Payment description" disabled={!paymentId || saving} />
              </div>
            </div>

            {selectedPayment && selectedClient && (
              <div style={{ marginTop: 16, padding: 14, border: `1px solid ${border}`, borderRadius: 9, color: '#D8D0C4', fontSize: 13, lineHeight: 1.7 }}>
                Receipt for <strong style={{ color: '#F5E4C7' }}>{selectedClient.client_name}</strong>
                {selectedClient.email ? ` · ${selectedClient.email}` : ''}
                {selectedProject ? ` · ${selectedProject.project_name}` : ''}
              </div>
            )}

            <button type="submit" disabled={saving || !paymentId} style={{ marginTop: 18, padding: '12px 18px', border: '1px solid #9B7845', borderRadius: 8, background: gold, color: '#17110A', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'CREATING RECEIPT...' : 'CREATE RECEIPT'}
            </button>
          </form>
        )}
      </section>

      {error && <div role="alert" style={{ color: '#FFC3AE', background: '#281611', border: '1px solid #704536', borderRadius: 9, padding: 14, marginBottom: 18, overflowWrap: 'anywhere', fontSize: 13 }}>{error}</div>}
      {message && <div role="status" style={{ color: '#D7B477', background: '#201910', border: `1px solid ${border}`, borderRadius: 9, padding: 14, marginBottom: 18, fontSize: 13 }}>{message}</div>}

      {preview && (
        <section className="dp-receipt-card dp-receipt-no-print" style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ color: gold, fontFamily: 'Georgia, serif', fontSize: 21, margin: 0 }}>Receipt Preview</h2>
            <div className="dp-receipt-actions">
              <button type="button" onClick={() => handlePrint(preview)} style={{ padding: '9px 13px', border: '1px solid #9B7845', borderRadius: 8, background: gold, color: '#17110A', fontWeight: 700, cursor: 'pointer' }}>PRINT / SAVE PDF</button>
              {getWhatsAppLink(preview) ? (
                <a href={getWhatsAppLink(preview)} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '9px 13px', border: '1px solid #39734B', borderRadius: 8, background: '#14271B', color: '#B9E8C7', textDecoration: 'none', fontWeight: 700 }}>OPEN WHATSAPP</a>
              ) : (
                <button type="button" disabled title="Add a phone number to the client record first" style={{ padding: '9px 13px', border: '1px solid #493A25', borderRadius: 8, background: '#201910', color: '#948B7F' }}>CLIENT PHONE NEEDED</button>
              )}
            </div>
          </div>
          <ReceiptPaper receipt={preview} client={previewClient} payment={previewPayment} project={previewProject} projectBudget={previewProjectBudget} paidToDate={previewPaidToDate} balanceDue={previewBalanceDue} />
        </section>
      )}

      <section className="dp-receipt-card">
        <h2 style={{ color: gold, fontFamily: 'Georgia, serif', fontSize: 23, marginTop: 0 }}>Receipts List ({receipts.length})</h2>
        {loading ? <p style={{ color: '#AFA79C' }}>Loading receipts...</p> : receipts.length === 0 ? <p style={{ color: '#AFA79C', lineHeight: 1.7 }}>No receipts have been created yet.</p> : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="dp-receipt-table">
              <thead><tr><th>Receipt</th><th>Client</th><th>Amount</th><th>Issued</th><th>Actions</th></tr></thead>
              <tbody>{receipts.map((receipt) => {
                const client = clients.find((item) => item.id === receipt.client_id)
                const whatsappLink = getWhatsAppLink(receipt)
                return <tr key={receipt.id}>
                  <td><strong style={{ color: '#F5E4C7' }}>{receipt.receipt_number}</strong><div style={{ color: '#948B7F', marginTop: 4 }}>{receipt.description || 'Payment receipt'}</div></td>
                  <td>{client?.client_name || '—'}{client?.email && <div style={{ color: '#948B7F', marginTop: 4 }}>{client.email}</div>}</td>
                  <td>{money(Number(receipt.amount), receipt.currency)}</td>
                  <td>{new Date(`${receipt.issue_date}T00:00:00`).toLocaleDateString()}</td>
                  <td><div className="dp-receipt-actions">
                    <button type="button" onClick={() => setPreview(receipt)} style={{ padding: '8px 10px', border: '1px solid #755B36', borderRadius: 7, background: '#201910', color: '#E4C78F', cursor: 'pointer' }}>View</button>
                    <button type="button" onClick={() => handlePrint(receipt)} style={{ padding: '8px 10px', border: '1px solid #9B7845', borderRadius: 7, background: gold, color: '#17110A', fontWeight: 700, cursor: 'pointer' }}>Print / PDF</button>
                    {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '8px 10px', border: '1px solid #39734B', borderRadius: 7, background: '#14271B', color: '#B9E8C7', textDecoration: 'none' }}>WhatsApp</a>}
                  </div></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      {preview && (
        <div id="dp-receipt-print" className="dp-receipt-preview">
          <ReceiptPaper receipt={preview} client={previewClient} payment={previewPayment} project={previewProject} projectBudget={previewProjectBudget} paidToDate={previewPaidToDate} balanceDue={previewBalanceDue} />
        </div>
      )}
    </div>
  )
}

type ReceiptPaperProps = {
  receipt: Receipt
  client: Client | undefined
  payment: Payment | undefined
  project: Project | undefined
  projectBudget: number | null
  paidToDate: number
  balanceDue: number | null
}

function ReceiptPaper({
  receipt,
  client,
  payment,
  project,
  projectBudget,
  paidToDate,
  balanceDue,
}: ReceiptPaperProps) {
  const isPaidInFull = balanceDue !== null && balanceDue <= 0

  return (
    <div style={{ background: '#fffdf8', color: '#211b12', fontFamily: 'Arial, sans-serif', padding: 38, borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start', borderBottom: '2px solid #b98d4c', paddingBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/dp-logo.png" alt="DP Creative Studio" style={{ width: 86, height: 72, objectFit: 'contain' }} />
          <div>
            <div style={{ color: '#9b7237', fontSize: 11, letterSpacing: 2.5, fontWeight: 700 }}>DP CREATIVE STUDIO</div>
            <div style={{ marginTop: 5, color: '#6f6250', fontSize: 12 }}>Creative services · Digital experiences</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#9b7237', fontFamily: 'Georgia, serif', fontSize: 25, fontWeight: 700 }}>PAYMENT RECEIPT</div>
          <div style={{ marginTop: 8, color: '#665b4b', fontSize: 12 }}>Receipt No. <strong style={{ color: '#211b12' }}>{receipt.receipt_number}</strong></div>
          <div style={{ marginTop: 4, color: '#665b4b', fontSize: 12 }}>Issued {new Date(`${receipt.issue_date}T00:00:00`).toLocaleDateString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 28, padding: '26px 0' }}>
        <div>
          <div style={{ color: '#9b7237', fontSize: 10, letterSpacing: 1.6, fontWeight: 700 }}>RECEIVED FROM</div>
          <div style={{ marginTop: 8, fontSize: 17, fontWeight: 700 }}>{client?.client_name || 'Client'}</div>
          {client?.email && <div style={{ marginTop: 4, color: '#6f6250', fontSize: 12 }}>{client.email}</div>}
          {client?.phone && <div style={{ marginTop: 4, color: '#6f6250', fontSize: 12 }}>{client.phone}</div>}
        </div>
        <div style={{ minWidth: 180 }}>
          <div style={{ color: '#9b7237', fontSize: 10, letterSpacing: 1.6, fontWeight: 700 }}>PAYMENT DETAILS</div>
          {project && <div style={{ marginTop: 8, fontSize: 13 }}><strong>Project:</strong> {project.project_name}</div>}
          {payment?.payment_method && <div style={{ marginTop: 6, fontSize: 13 }}><strong>Method:</strong> {payment.payment_method}</div>}
          <div style={{ marginTop: 6, fontSize: 13 }}><strong>Status:</strong> Paid</div>
        </div>
      </div>

      <div style={{ border: '1px solid #e1d5bf', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', background: '#f5efe4', color: '#665b4b', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          <span>DESCRIPTION</span><span>PAID NOW</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '19px 16px', fontSize: 14 }}>
          <span>{receipt.description || 'Payment received'}</span>
          <strong>{money(Number(receipt.amount), receipt.currency)}</strong>
        </div>
      </div>

      <div style={{ marginTop: 18, border: '1px solid #e1d5bf', borderRadius: 8, overflow: 'hidden' }}>
        {projectBudget !== null ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '13px 16px', borderBottom: '1px solid #e1d5bf', fontSize: 13 }}>
              <span style={{ color: '#665b4b' }}>Project total</span>
              <strong>{money(projectBudget, receipt.currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '13px 16px', borderBottom: '1px solid #e1d5bf', fontSize: 13 }}>
              <span style={{ color: '#665b4b' }}>Paid this payment</span>
              <strong>{money(Number(receipt.amount), receipt.currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '13px 16px', borderBottom: '1px solid #e1d5bf', fontSize: 13 }}>
              <span style={{ color: '#665b4b' }}>Total received to date</span>
              <strong>{money(paidToDate, receipt.currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '15px 16px', background: '#f5efe4', fontWeight: 700, fontSize: 15 }}>
              <span>{isPaidInFull ? 'Balance due' : 'Balance remaining'}</span>
              <span style={{ color: isPaidInFull ? '#39734B' : '#9b7237' }}>
                {balanceDue === null ? '—' : money(balanceDue, receipt.currency)}
              </span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '15px 16px', background: '#f5efe4', fontWeight: 700, fontSize: 15 }}>
            <span>Paid this payment</span>
            <span style={{ color: '#9b7237' }}>{money(Number(receipt.amount), receipt.currency)}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18, marginTop: 26, padding: 16, borderRadius: 8, background: '#f5efe4' }}>
        <div>
          <div style={{ color: '#9b7237', fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }}>PAYMENT RECEIVED</div>
          <div style={{ marginTop: 5, color: '#665b4b', fontSize: 12 }}>Thank you for choosing DP Creative Studio.</div>
        </div>
        <div style={{ padding: '7px 13px', border: '1px solid #9b7237', borderRadius: 20, color: isPaidInFull ? '#39734B' : '#80602f', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          {projectBudget === null ? 'PAYMENT RECEIVED' : isPaidInFull ? 'PAID IN FULL' : 'PARTIAL PAYMENT'}
        </div>
      </div>
      <div style={{ marginTop: 28, textAlign: 'center', color: '#8b806f', fontSize: 11 }}>Thank you for your trust. We appreciate your business.</div>
    </div>
  )
}
