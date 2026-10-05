import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { deptApi } from '../../api/adminApi'

const AdminDepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editDept, setEditDept] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await deptApi.getAll()
      setDepartments(res.data)
    } catch { setError('Failed to load departments.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editDept) {
        await deptApi.update(editDept.id, { name: form.name, description: form.description })
      } else {
        await deptApi.create({ name: form.name, description: form.description })
      }
      setShowModal(false)
      load()
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to save.') }
    finally { setSaving(false) }
  }

  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const toggleActive = async (dept: any) => {
    try {
      await deptApi.update(dept.id, { name: dept.name, description: dept.description, active: !dept.active })
      load()
    } catch { setError('Failed to update department status.') }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deptApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete department.')
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
            <h1 className="page-title">Departments</h1>
            <p className="page-subtitle">Manage system departments for routing tickets.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditDept(null); setForm({ name:'', description:'' }); setShowModal(true) }}>
            + New Department
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table" aria-label="Departments list">
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Description</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.8rem' }}>{d.id}</td>
                      <td style={{ fontWeight:500 }}>{d.name}</td>
                      <td style={{ color:'var(--color-text-secondary)', fontSize:'0.85rem' }}>{d.description}</td>
                      <td><span className={`badge ${d.active ? 'badge-success' : 'badge-closed'}`}>{d.active ? 'Active' : 'Disabled'}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditDept(d); setForm({ name: d.name, description: d.description || '' }); setShowModal(true) }}>
                          Edit
                        </button>
                        <button className={`btn btn-sm ${d.active ? 'btn-danger' : 'btn-secondary'} ml-2`} onClick={() => toggleActive(d)}>
                          {d.active ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-danger btn-sm ml-2" onClick={() => setDeleteTarget(d)}>
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
                <h2 className="modal-title">{editDept ? 'Edit Department' : 'New Department'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={save}>
                <div className="form-group mb-4">
                  <label htmlFor="name">Department Name</label>
                  <input id="name" type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group mb-6">
                  <label htmlFor="desc">Description</label>
                  <textarea id="desc" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
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
                <h2 className="modal-title">Delete Department</h2>
                <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
              </div>
              <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?
                This will unlink this department from any associated tickets or staff members.
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

export default AdminDepartmentsPage
