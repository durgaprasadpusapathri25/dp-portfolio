import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../supabase'

type PortfolioItem = {
  id: string
  title: string
  category: string
  media_url: string
  media_type: 'image' | 'video'
  alt_text: string | null
  description: string | null
  tags: string[]
  project_url: string | null
  is_published: boolean
  sort_order: number
  created_at: string
}

const BUCKET = 'portfolio-images'
const MAX_FILE_SIZE = 50 * 1024 * 1024
const CATEGORY_OPTIONS = [
  'Website',
  'Thumbnail',
  'Graphic Design',
  'Poster',
  'Video',
  'Branding',
  'Other',
]
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

const emptyForm = {
  title: '',
  category: '',
  description: '',
  tags: '',
  project_url: '',
  is_published: true,
}

export default function PortfolioSection() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentMediaUrl, setCurrentMediaUrl] = useState('')
  const [currentMediaType, setCurrentMediaType] =
    useState<'image' | 'video'>('image')
  const [form, setForm] = useState(emptyForm)

  async function loadItems() {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('portfolio_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
    } else {
      setItems((data ?? []) as PortfolioItem[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadItems()
  }, [])

  function resetForm() {
    setForm(emptyForm)
    setSelectedFile(null)
    setCurrentMediaUrl('')
    setCurrentMediaType('image')
    setEditingId(null)
  }

  function getStoragePath(url: string) {
    const marker = `/${BUCKET}/`
    const markerIndex = url.indexOf(marker)
    if (markerIndex < 0) return null
    return decodeURIComponent(url.slice(markerIndex + marker.length))
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setError('')
    setMessage('')

    if (!form.title.trim() || !form.category.trim()) {
      setError('Title and category are required.')
      return
    }

    if (!editingId && !selectedFile) {
      setError('Please choose an image or video.')
      return
    }

    if (selectedFile) {
      if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
        setError('Choose a JPG, PNG, WEBP, MP4, WEBM, or MOV file.')
        return
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError('The file must be 50 MB or smaller.')
        return
      }
    }

    setSaving(true)
    let uploadedPath: string | null = null

    try {
      let mediaUrl = currentMediaUrl
      let mediaType = currentMediaType

      if (selectedFile) {
        const extension = selectedFile.name.split('.').pop()?.toLowerCase() || 'file'
        uploadedPath = `${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(uploadedPath, selectedFile, {
            upsert: false,
            contentType: selectedFile.type,
          })

        if (uploadError) throw uploadError

        mediaUrl = supabase.storage
          .from(BUCKET)
          .getPublicUrl(uploadedPath).data.publicUrl

        mediaType = selectedFile.type.startsWith('video/')
          ? 'video'
          : 'image'
      }

      const values = {
        title: form.title.trim(),
        category: form.category.trim(),
        description: form.description.trim() || null,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        project_url: form.project_url.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        alt_text: form.title.trim(),
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
      }

      const result = editingId
        ? await supabase.from('portfolio_items').update(values).eq('id', editingId)
        : await supabase.from('portfolio_items').insert(values)

      if (result.error) throw result.error

      if (selectedFile && editingId && currentMediaUrl) {
        const oldPath = getStoragePath(currentMediaUrl)
        if (oldPath) {
          await supabase.storage.from(BUCKET).remove([oldPath])
        }
      }

      setMessage(editingId ? 'Portfolio item updated.' : 'Portfolio item added.')
      resetForm()
      await loadItems()
    } catch (saveError) {
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath])
      }
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save this portfolio item.',
      )
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(item: PortfolioItem) {
    setEditingId(item.id)
    setCurrentMediaUrl(item.media_url)
    setCurrentMediaType(item.media_type)
    setSelectedFile(null)
    setForm({
      title: item.title,
      category: item.category,
      description: item.description ?? '',
      tags: item.tags.join(', '),
      project_url: item.project_url ?? '',
      is_published: item.is_published,
    })
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handlePublishToggle(item: PortfolioItem) {
    setError('')
    setMessage('')

    const { error: updateError } = await supabase
      .from('portfolio_items')
      .update({
        is_published: !item.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage(item.is_published ? 'Item unpublished.' : 'Item published.')
    await loadItems()
  }

  async function handleDelete(item: PortfolioItem) {
    if (!window.confirm(`Delete "${item.title}" from the portfolio?`)) return

    setError('')
    setMessage('')

    const { error: deleteError } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', item.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    const storagePath = getStoragePath(item.media_url)
    if (storagePath) {
      await supabase.storage.from(BUCKET).remove([storagePath])
    }

    setMessage('Portfolio item deleted.')
    await loadItems()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#0C0B0A',
    color: '#F7F2E9',
    border: '1px solid #493A25',
    borderRadius: 8,
    padding: '12px 13px',
    marginTop: 7,
    fontSize: 14,
  }

  return (
    <div>
      <section className="dp-admin-card" style={{ marginBottom: 22 }}>
        <h2 style={{ color: '#D7B477', fontFamily: 'Georgia, serif', marginTop: 0 }}>
          {editingId ? 'Edit Portfolio Item' : 'Add to Portfolio'}
        </h2>
        <p style={{ color: '#AFA79C', fontSize: 13, lineHeight: 1.7 }}>
          Add a website, thumbnail, design, or video to your public portfolio.
        </p>

        {error && <p role="alert" style={{ color: '#FFC3AE' }}>{error}</p>}
        {message && <p role="status" style={{ color: '#D7B477' }}>{message}</p>}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 16 }}>
            <label style={{ color: '#D8C9AE', fontSize: 13 }}>
              Title *
              <input
                style={inputStyle}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                maxLength={150}
                required
              />
            </label>

            <label style={{ color: '#D8C9AE', fontSize: 13 }}>
              Category *
              <select
                style={inputStyle}
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                required
              >
                <option value="" disabled>
                  Select a category
                </option>
                {form.category && !CATEGORY_OPTIONS.includes(form.category) && (
                  <option value={form.category}>{form.category}</option>
                )}
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ color: '#D8C9AE', fontSize: 13 }}>
              Website link (optional)
              <input
                type="url"
                style={inputStyle}
                value={form.project_url}
                onChange={(event) => setForm({ ...form, project_url: event.target.value })}
                placeholder="https://example.com"
              />
            </label>

            <label style={{ color: '#D8C9AE', fontSize: 13 }}>
              Tags (comma separated)
              <input
                style={inputStyle}
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="Website, React, Design"
              />
            </label>
          </div>

          <label style={{ display: 'block', color: '#D8C9AE', fontSize: 13, marginTop: 16 }}>
            Description
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={2000}
            />
          </label>

          <label style={{ display: 'block', color: '#D8C9AE', fontSize: 13, marginTop: 16 }}>
            Image or video {editingId ? '(choose only to replace current media)' : '*'}
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              style={inputStyle}
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            {currentMediaUrl && !selectedFile && (
              <span style={{ display: 'block', marginTop: 8, color: '#AFA79C' }}>
                Current media will be kept unless you choose a replacement.
              </span>
            )}
          </label>

          <label style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#D8C9AE', marginTop: 18 }}>
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) => setForm({ ...form, is_published: event.target.checked })}
            />
            Publish on public portfolio
          </label>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            <button className="dp-admin-primary" type="submit" disabled={saving}>
              {saving ? 'SAVING...' : editingId ? 'SAVE CHANGES' : '+ ADD TO PORTFOLIO'}
            </button>
            {editingId && (
              <button className="dp-admin-logout" type="button" onClick={resetForm}>
                CANCEL
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="dp-admin-card">
        <h2 style={{ color: '#D7B477', fontFamily: 'Georgia, serif', marginTop: 0 }}>
          Portfolio Items ({items.length})
        </h2>

        {loading ? (
          <p style={{ color: '#AFA79C' }}>Loading portfolio items...</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#AFA79C' }}>No portfolio items added yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 16 }}>
            {items.map((item) => (
              <article key={item.id} style={{ border: '1px solid #493A25', borderRadius: 10, padding: 14 }}>
                {item.media_type === 'video' ? (
                  <video src={item.media_url} controls style={{ width: '100%', maxHeight: 220 }} />
                ) : (
                  <img src={item.media_url} alt={item.alt_text ?? item.title} style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }} />
                )}
                <h3 style={{ color: '#F5E4C7' }}>{item.title}</h3>
                <p style={{ color: '#D7B477' }}>{item.category}</p>
                <p style={{ color: item.is_published ? '#9BD7A7' : '#AFA79C' }}>
                  {item.is_published ? 'Published' : 'Draft'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" className="dp-admin-logout" onClick={() => handleEdit(item)}>
                    Edit
                  </button>
                  <button type="button" className="dp-admin-logout" onClick={() => void handlePublishToggle(item)}>
                    {item.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button type="button" className="dp-admin-delete" onClick={() => void handleDelete(item)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}