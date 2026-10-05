import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { categoryApi, deptApi } from '../../api/adminApi'

const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '', departmentId: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [catRes, deptRes] = await Promise.all([categoryApi.getAll(), deptApi.getAll()])
      setCategories(catRes.data)
      setDepartments(deptRes.data)
    } catch { setError('Failed to load categories.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { 
        name: form.name, 
        description: form.description, 
        departmentId: form.departmentId ? Number(form.departmentId) : undefined 
      }
      if (editCat) {
        await categoryApi.update(editCat.id, payload)
      } else {
        await categoryApi.create(payload)
      }
      setShowModal(false)
      load()
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to save.') }
    finally { setSaving(false) }
  }

  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const toggleActive = async (cat: any) => {
    try {
      await categoryApi.update(cat.id, { 
        name: cat.name, 
        description: cat.description, 
        departmentId: cat.department?.id, 
        active: !cat.active 
      })
      load()
    } catch { setError('Failed to update category status.') }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await categoryApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete category.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        {error && <div className="alert alert-danger mb-4" role="alert">⚠️ {error} <button className="btn btn-ghost btn-sm" onClick={() => setError('')}>Dismiss</button></div>}

        <div className="page-header">
          <div>
            <h1 className="page-title">Categories</h1>
            <p className="page-subtitle">Manage ticket categories and default routing rules.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditCat(null); setForm({ name:'', description:'', departmentId:'' }); setShowModal(true) }}>
            + New Category
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table" aria-label="Categories list">
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Description</th><th>Default Dept</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.8rem' }}>{c.id}</td>
                      <td style={{ fontWeight:500 }}>{c.name}</td>
                      <td style={{ color:'var(--color-text-secondary)', fontSize:'0.85rem' }}>{c.description}</td>
                      <td style={{ color:'var(--color-text-secondary)', fontSize:'0.85rem' }}>{c.department?.name || '—'}</td>
                      <td><span className={`badge ${c.active ? 'badge-success' : 'badge-closed'}`}>{c.active ? 'Active' : 'Disabled'}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => { 
                          setEditCat(c); 
                          setForm({ name: c.name, description: c.description || '', departmentId: c.department?.id || '' }); 
                          setShowModal(true) 
                        }}>
                          Edit
                        </button>
                        <button className={`btn btn-sm ${c.active ? 'btn-danger' : 'btn-secondary'} ml-2`} onClick={() => toggleActive(c)}>
                          {c.active ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-danger btn-sm ml-2" onClick={() => setDeleteTarget(c)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">{editCat ? 'Edit Category' : 'New Category'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={save}>
                <div className="form-group mb-4">
                  <label htmlFor="name">Category Name</label>
                  <input id="name" type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group mb-4">
                  <label htmlFor="desc">Description</label>
                  <textarea id="desc" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="form-group mb-6">
                  <label htmlFor="dept">Default Department Routing</label>
                  <select id="dept" value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})}>
                    <option value="">— No Default Routing —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tickets in this category will be auto-assigned to this department.</span>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner" /> Saving…</> : 'Save'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: 460 }}>
              <div className="modal-header">
                <h2 className="modal-title">Delete Category</h2>
                <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
              </div>
              <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?
                This will unlink this category from any tickets currently assigned to it.
              </p>
              <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleConfirmDelete} disabled={deleting}>
                  {deleting ? <><span className="spinner" /> Deleting…</> : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminCategoriesPage
