import React, { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { adminUsersReportsApi, deptApi, studentApi } from '../../api/adminApi'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['STUDENT', 'HELP_DESK_OFFICER', 'DEPARTMENT_STAFF', 'WELFARE_OFFICER', 'MANAGEMENT', 'ADMIN']
const today = new Date().toISOString().split('T')[0]

const roleBadge: Record<string, string> = {
  STUDENT: 'badge-assigned',
  HELP_DESK_OFFICER: 'badge-inprogress',
  DEPARTMENT_STAFF: 'badge-success',
  WELFARE_OFFICER: 'badge-welfare',
  MANAGEMENT: 'badge-urgent',
  ADMIN: 'badge-closed',
}

const FEE_STATUS_COLOR: Record<string, string> = {
  PAID: 'var(--color-resolved)',
  PARTIAL: 'var(--color-inprogress)',
  UNPAID: 'var(--color-urgent)',
  OVERDUE: '#ef4444',
  WAIVED: 'var(--color-text-muted)',
}

const RESULT_COLOR: Record<string, string> = {
  PASS: 'var(--color-resolved)',
  FAIL: '#ef4444',
  ABSENT: 'var(--color-urgent)',
  REPEAT: '#f97316',
  PENDING: 'var(--color-text-muted)',
}

type ProfileTab = 'personal' | 'academic' | 'fees' | 'exams' | 'tickets'

const InfoCard = ({ label, value }: { label: string; value: any }) => (
  <div style={{ background: 'var(--color-surface-2)', borderRadius: 8, padding: '0.75rem 1rem' }}>
    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: '0.9rem', fontWeight: 500, wordBreak: 'break-word' }}>{value ?? '—'}</div>
  </div>
)

const AdminUsersPage: React.FC = () => {
  const { user: me } = useAuth()
  const isAdmin = (me as any)?.role === 'ADMIN'

  const [users, setUsers] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [exportingUsers, setExportingUsers] = useState(false)

  // Profile panel
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [profileTab, setProfileTab] = useState<ProfileTab>('personal')
  const [studentProfile, setStudentProfile] = useState<any | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Modals
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'STUDENT', departmentId: '' })
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  useEffect(() => { deptApi.getAll(true).then((r) => setDepartments(r.data || [])).catch(() => {}) }, [])
  const [creating, setCreating] = useState(false)
  const [resetModal, setResetModal] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Student Profile Edit Modal
  const [studentEditModal, setStudentEditModal] = useState(false)
  const [studentEditForm, setStudentEditForm] = useState<any>({})
  const [savingStudent, setSavingStudent] = useState(false)

  const load = useCallback(async (p = 0, role = roleFilter, search = searchQ) => {
    setLoading(true)
    try {
      const res = await adminUsersReportsApi.getUsers(p, 20, role !== 'ALL' ? role : undefined, search)
      setUsers(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
    } catch { setError('Failed to load users.') }
    finally { setLoading(false) }
  }, [roleFilter, searchQ])

  useEffect(() => { load(page) }, [page])

  /** Exports the currently filtered user list (role + search) as a CSV
   *  report — a plain account listing for handing off/archiving, not analytics. */
  const exportUsers = async () => {
    setExportingUsers(true)
    try {
      const res = await adminUsersReportsApi.exportUsersCsv(roleFilter !== 'ALL' ? roleFilter : undefined, searchQ || undefined)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-report_${today}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      setSuccess('User report downloaded successfully.')
    } catch {
      setError('Failed to export user report.')
    } finally {
      setExportingUsers(false)
    }
  }

  // Re-query the server (rather than filtering client-side) whenever the role
  // filter or search text changes, debouncing the search text so we don't
  // fire a request per keystroke.
  const isFirstFilterRun = React.useRef(true)
  useEffect(() => {
    if (isFirstFilterRun.current) { isFirstFilterRun.current = false; return }
    const t = setTimeout(() => { setPage(0); load(0, roleFilter, searchQ) }, 350)
    return () => clearTimeout(t)
  }, [roleFilter, searchQ])

  const openProfile = async (u: any) => {
    setSelectedUser(u)
    setProfileTab('personal')
    // Show the list row straight away, then refresh it with the latest record from the server
    // (GET /api/admin/users/{id}) so the panel never shows stale data after an edit elsewhere.
    adminUsersReportsApi.getUserById(u.id)
      .then((res) => setSelectedUser((cur: any) => (cur && cur.id === u.id ? res.data : cur)))
      .catch(() => { /* keep the list data if the refresh fails */ })
    setStudentProfile(null)
    if (u.role === 'STUDENT') {
      setProfileLoading(true)
      try {
        const res = await adminUsersReportsApi.getStudentProfile(u.id)
        setStudentProfile(res.data)
      } catch (err) {
        console.warn('adminUsersReportsApi.getStudentProfile failed, trying studentApi.getProfile:', err)
        try {
          const fallback = await studentApi.getProfile(u.id)
          setStudentProfile(fallback.data)
        } catch (fErr) {
          console.warn('Could not load student profile:', fErr)
          setStudentProfile({
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            studentId: u.studentId,
            fees: [],
            exams: [],
          })
        }
      } finally {
        setProfileLoading(false)
      }
    }
  }

  const handleUpdateRole = async (userId: number, role: string) => {
    if (userId === (me as any)?.userId) { setError("You cannot change your own role."); return }
    try { await adminUsersReportsApi.updateRole(userId, role); load(page) }
    catch { setError('Failed to update role.') }
  }

  const handleToggleActive = async (u: any) => {
    try {
      await adminUsersReportsApi.setActive(u.id, !u.active)
      setSuccess(`${u.fullName} ${u.active ? 'deactivated' : 'activated'} successfully.`)
      load(page)
      if (selectedUser?.id === u.id) setSelectedUser({ ...selectedUser, active: !u.active })
    } catch { setError('Failed to update account status.') }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await adminUsersReportsApi.updateUser(selectedUser.id, editForm)
      setSuccess('User info updated successfully.')
      setEditModal(false)
      setSelectedUser(res.data)
      load(page)
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to update user.') }
    finally { setSaving(false) }
  }

  const openStudentEdit = () => {
    // Fixed: this used to pre-fill blank profiles with specific fake-looking data
    // (a real address, a real phone number, a real GPA) that an admin could save
    // as-is without realising it wasn't the student's actual information. Blank
    // fields now stay blank until the admin actually enters something.
    setStudentEditForm({
      nicNumber: studentProfile?.nicNumber || '',
      dateOfBirth: studentProfile?.dateOfBirth ? (typeof studentProfile.dateOfBirth === 'string' ? studentProfile.dateOfBirth.slice(0, 10) : studentProfile.dateOfBirth) : '',
      gender: studentProfile?.gender || '',
      city: studentProfile?.city || '',
      address: studentProfile?.address || '',
      guardianName: studentProfile?.guardianName || '',
      guardianPhone: studentProfile?.guardianPhone || '',
      guardianRelationship: studentProfile?.guardianRelationship || '',
      degreeProgramme: studentProfile?.degreeProgramme || '',
      faculty: studentProfile?.faculty || '',
      specialisation: studentProfile?.specialisation || '',
      intakeYear: studentProfile?.intakeYear || '',
      intakeMonth: studentProfile?.intakeMonth || '',
      currentSemester: studentProfile?.currentSemester || '',
      academicYear: studentProfile?.academicYear || '',
      cgpa: studentProfile?.cgpa || '',
      scholarshipStatus: studentProfile?.scholarshipStatus || '',
      hostelResident: !!studentProfile?.hostelResident,
      medicalNotes: studentProfile?.medicalNotes || '',
    })
    setStudentEditModal(true)
  }

  const handleSaveStudentProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setSavingStudent(true)
    try {
      await adminUsersReportsApi.upsertStudentProfile(selectedUser.id, studentEditForm)
      setSuccess('Student academic & personal details saved successfully.')
      setStudentEditModal(false)
      const res = await adminUsersReportsApi.getStudentProfile(selectedUser.id)
      setStudentProfile(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save student record.')
    } finally {
      setSavingStudent(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminUsersReportsApi.deleteUser(deleteTarget.id)
      setSuccess(`${deleteTarget.fullName}'s account has been removed.`)
      setDeleteTarget(null)
      if (selectedUser?.id === deleteTarget.id) setSelectedUser(null)
      load(page)
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to delete user.') }
    finally { setDeleting(false) }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    setResetting(true)
    try {
      await adminUsersReportsApi.resetPassword(resetTarget.id, newPassword)
      setSuccess(`Password for ${resetTarget.fullName} has been reset.`)
      setResetModal(false)
      setNewPassword('')
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to reset password.') }
    finally { setResetting(false) }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await adminUsersReportsApi.createUser({ ...newUser, departmentId: newUser.departmentId || undefined })
      setSuccess('User created successfully.')
      setCreateModal(false)
      setNewUser({ fullName: '', email: '', password: '', role: 'STUDENT', departmentId: '' })
      load(0)
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create user.') }
    finally { setCreating(false) }
  }

  const fmt = (val: any) => val ?? '—'
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-LK') : '—'
  const fmtCurrency = (val: any) => val != null ? `LKR ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* ── LEFT: User List ───────────────────────── */}
        <div style={{ flex: selectedUser ? '0 0 460px' : '1', minWidth: 0 }}>
          {error && (
            <div className="alert alert-danger mb-4" role="alert">
              ⚠️ {error}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: '1rem' }} onClick={() => setError('')}>Dismiss</button>
            </div>
          )}
          {success && (
            <div className="alert alert-info mb-4">
              ✅ {success}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: '1rem' }} onClick={() => setSuccess('')}>✕</button>
            </div>
          )}

          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title">User Management</h1>
              <p className="page-subtitle">View, edit, deactivate, and manage all system accounts.</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={exportUsers} disabled={exportingUsers} title="Export the currently filtered user list as a CSV report">
                  {exportingUsers ? '⏳ Exporting…' : '📥 Export CSV'}
                </button>
                <button className="btn btn-primary" onClick={() => setCreateModal(true)} id="btn-new-user">+ New User</button>
              </div>
            )}
          </div>

          {/* Search & Filter */}
          <div className="card mb-4" style={{ background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="Search name, email, student ID…" className="search-input"
                value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '0.45rem 0.85rem', fontSize: '0.875rem' }} />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {['ALL', ...ROLES].map((r) => (
                  <button key={r} className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setRoleFilter(r)} style={{ fontSize: '0.72rem' }}>
                    {r === 'ALL' ? '👥 All' : r.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            {loading ? <div className="loading-screen"><span className="spinner spinner-lg" /></div> : (
              <>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Showing {users.length} accounts (page {page + 1} of {Math.max(totalPages, 1)})
                </div>
                <div className="data-table-wrapper">
                  <table className="data-table" aria-label="Users list">
                    <thead>
                      <tr>
                        <th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const isMe = u.id === (me as any)?.userId
                        const isSelected = selectedUser?.id === u.id
                        return (
                          <tr key={u.id} onClick={() => openProfile(u)} style={{
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(54,210,250,0.1)' : undefined,
                            borderLeft: isSelected ? '3px solid var(--color-primary-500)' : undefined,
                          }}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                              {u.studentId && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>🎓 {u.studentId}</div>}
                            </td>
                            <td>
                              <span className={`badge ${roleBadge[u.role] || 'badge-assigned'}`} style={{ fontSize: '0.7rem' }}>
                                {u.role?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${u.active ? 'badge-success' : 'badge-closed'}`}>
                                {u.active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="flex gap-2" style={{ flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                                <button className="btn btn-ghost btn-sm" onClick={() => openProfile(u)}>👤 View</button>
                                {isAdmin && !isMe && (
                                  <>
                                    <button className="btn btn-secondary btn-sm"
                                      style={{ color: u.active ? 'var(--color-urgent)' : 'var(--color-resolved)' }}
                                      onClick={() => handleToggleActive(u)}>
                                      {u.active ? '🔒 Deactivate' : '✅ Activate'}
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(u)}>🗑️</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="pagination">
                    <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span className="text-sm text-secondary">Page {page + 1} of {totalPages}</span>
                    <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Profile Panel ──────────────────── */}
        {selectedUser && (
          <div style={{ flex: 1, minWidth: 0, animation: 'fadeIn 0.22s ease' }}>
            {/* Header card */}
            <div className="card mb-4" style={{ border: '2px solid var(--color-primary-500)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1.3rem', flexShrink: 0,
                  }}>
                    {selectedUser.fullName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>{selectedUser.fullName}</h2>
                      <span className={`badge ${roleBadge[selectedUser.role] || 'badge-assigned'}`} style={{ fontSize: '0.7rem' }}>
                        {selectedUser.role?.replace(/_/g, ' ')}
                      </span>
                      <span className={`badge ${selectedUser.active ? 'badge-success' : 'badge-closed'}`} style={{ fontSize: '0.7rem' }}>
                        {selectedUser.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                      ✉️ {selectedUser.email}
                      {selectedUser.phone && ` · 📞 ${selectedUser.phone}`}
                      {selectedUser.studentId && ` · 🎓 ${selectedUser.studentId}`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Joined: {new Date(selectedUser.createdAt).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {selectedUser.departmentName && ` · 🏢 ${selectedUser.departmentName}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
                  {isAdmin && (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => { openProfile(selectedUser); setEditForm({ fullName: selectedUser.fullName, email: selectedUser.email, phone: selectedUser.phone || '' }); setEditModal(true) }}>✏️ Edit</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setResetTarget(selectedUser); setNewPassword(''); setResetModal(true) }}>🔑 Reset Pwd</button>
                      {selectedUser.id !== (me as any)?.userId && (
                        <>
                          <button className="btn btn-sm"
                            style={{ color: selectedUser.active ? 'var(--color-urgent)' : 'var(--color-resolved)', border: '1px solid currentColor', background: 'transparent' }}
                            onClick={() => handleToggleActive(selectedUser)}>
                            {selectedUser.active ? '🔒 Deactivate' : '✅ Activate'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(selectedUser)}>🗑️ Delete</button>
                        </>
                      )}
                    </>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>✕ Close</button>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Change Role:</label>
                  <select defaultValue={selectedUser.role}
                    onChange={(e) => handleUpdateRole(selectedUser.id, e.target.value)}
                    disabled={selectedUser.id === (me as any)?.userId}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.82rem', borderRadius: 6 }}>
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Student profile tabs */}
            {selectedUser.role === 'STUDENT' && (
              <div className="card" style={{ background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {([
                      { key: 'personal', label: '👤 Personal' },
                      { key: 'academic', label: '🎓 Academic' },
                      { key: 'fees', label: '💳 Fees' },
                      { key: 'exams', label: '📝 Exams' },
                      { key: 'tickets', label: `🎫 Tickets (${studentProfile?.tickets?.length ?? 0})` },
                    ] as { key: ProfileTab; label: string }[]).map((t) => (
                      <button key={t.key} className={`btn btn-sm ${profileTab === t.key ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setProfileTab(t.key)} style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {isAdmin && (
                    <button className="btn btn-secondary btn-sm" onClick={openStudentEdit} style={{ fontSize: '0.78rem' }}>
                      ✏️ Edit Student Record
                    </button>
                  )}
                </div>

                {profileLoading ? <div className="loading-screen"><span className="spinner" /></div> : (
                  <>
                    {profileTab === 'personal' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
                        <InfoCard label="Full Name" value={selectedUser.fullName} />
                        <InfoCard label="Email" value={selectedUser.email} />
                        <InfoCard label="Phone" value={fmt(studentProfile?.phone || selectedUser.phone)} />
                        <InfoCard label="Student ID" value={fmt(selectedUser.studentId)} />
                        <InfoCard label="NIC Number" value={fmt(studentProfile?.nicNumber)} />
                        <InfoCard label="Date of Birth" value={fmtDate(studentProfile?.dateOfBirth)} />
                        <InfoCard label="Gender" value={fmt(studentProfile?.gender)} />
                        <InfoCard label="City" value={fmt(studentProfile?.city)} />
                        <InfoCard label="Address" value={fmt(studentProfile?.address)} />
                        <InfoCard label="Guardian Name" value={fmt(studentProfile?.guardianName)} />
                        <InfoCard label="Guardian Phone" value={fmt(studentProfile?.guardianPhone)} />
                        <InfoCard label="Guardian Relationship" value={fmt(studentProfile?.guardianRelationship)} />
                        <InfoCard label="Hostel Resident" value={studentProfile?.hostelResident ? '✅ Yes' : '❌ No'} />
                        <InfoCard label="Medical Notes" value={fmt(studentProfile?.medicalNotes)} />
                      </div>
                    )}

                    {profileTab === 'academic' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
                        <InfoCard label="Degree Programme" value={fmt(studentProfile?.degreeProgramme)} />
                        <InfoCard label="Faculty" value={fmt(studentProfile?.faculty)} />
                        <InfoCard label="Specialisation" value={fmt(studentProfile?.specialisation)} />
                        <InfoCard label="Intake Year" value={fmt(studentProfile?.intakeYear)} />
                        <InfoCard label="Intake Month" value={fmt(studentProfile?.intakeMonth)} />
                        <InfoCard label="Current Semester" value={studentProfile?.currentSemester ? `Semester ${studentProfile.currentSemester}` : '—'} />
                        <InfoCard label="Academic Year" value={fmt(studentProfile?.academicYear)} />
                        <InfoCard label="CGPA" value={studentProfile?.cgpa ? `${studentProfile.cgpa} / 4.00` : '—'} />
                        <InfoCard label="Scholarship Status" value={fmt(studentProfile?.scholarshipStatus)} />
                      </div>
                    )}

                    {profileTab === 'fees' && (
                      (!studentProfile?.fees?.length) ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                          <div className="empty-icon">💳</div>
                          <p className="empty-title">No fee records</p>
                          <p className="empty-desc">No semester fee records have been entered yet.</p>
                        </div>
                      ) : (
                        <div className="data-table-wrapper">
                          <table className="data-table">
                            <thead><tr>
                              <th>Academic Year</th><th>Sem</th><th>Total Fee</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th><th>Remarks</th>
                            </tr></thead>
                            <tbody>
                              {studentProfile.fees.map((fee: any) => {
                                const balance = Number(fee.totalFee) - Number(fee.paidAmount)
                                return (
                                  <tr key={fee.id}>
                                    <td style={{ fontWeight: 600 }}>{fee.academicYear}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>Sem {fee.semester}</td>
                                    <td style={{ fontWeight: 700 }}>{fmtCurrency(fee.totalFee)}</td>
                                    <td style={{ color: 'var(--color-resolved)', fontWeight: 600 }}>{fmtCurrency(fee.paidAmount)}</td>
                                    <td style={{ color: balance > 0 ? 'var(--color-urgent)' : 'var(--color-resolved)', fontWeight: 700 }}>{fmtCurrency(balance)}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{fmtDate(fee.dueDate)}</td>
                                    <td>
                                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: `${FEE_STATUS_COLOR[fee.status] || 'gray'}22`, color: FEE_STATUS_COLOR[fee.status] || 'inherit' }}>
                                        {fee.status}
                                      </span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{fee.remarks || '—'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {profileTab === 'exams' && (
                      (!studentProfile?.exams?.length) ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                          <div className="empty-icon">📝</div>
                          <p className="empty-title">No exam records</p>
                          <p className="empty-desc">No exam / module results entered yet.</p>
                        </div>
                      ) : (
                        <div className="data-table-wrapper">
                          <table className="data-table">
                            <thead><tr>
                              <th>Acad. Year</th><th>Sem</th><th>Code</th><th>Module Name</th><th>Credits</th><th>Grade</th><th>GPA Pts</th><th>Result</th><th>Exam Date</th>
                            </tr></thead>
                            <tbody>
                              {studentProfile.exams.map((ex: any) => (
                                <tr key={ex.id}>
                                  <td>{ex.academicYear}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{ex.semester}</td>
                                  <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>{ex.moduleCode}</td>
                                  <td style={{ fontWeight: 500 }}>{ex.moduleName}</td>
                                  <td style={{ textAlign: 'center' }}>{ex.credits ?? '—'}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: ex.result === 'PASS' ? 'var(--color-resolved)' : ex.result === 'FAIL' ? '#ef4444' : 'inherit' }}>
                                    {ex.grade ?? '—'}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{ex.gradePoints ?? '—'}</td>
                                  <td>
                                    {ex.result && (
                                      <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: `${RESULT_COLOR[ex.result] || 'gray'}22`, color: RESULT_COLOR[ex.result] || 'inherit' }}>
                                        {ex.result}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{fmtDate(ex.examDate)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {profileTab === 'tickets' && (
                      (!studentProfile?.tickets?.length) ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                          <div className="empty-icon">🎫</div>
                          <p className="empty-title">No tickets found</p>
                          <p className="empty-desc">This student has not raised any help desk tickets yet.</p>
                        </div>
                      ) : (
                        <div className="data-table-wrapper">
                          <table className="data-table">
                            <thead><tr>
                              <th>Ref #</th><th>Subject</th><th>Category</th><th>Department</th><th>Priority</th><th>Status</th><th>Created</th><th>Resolved</th><th>Feedback</th>
                            </tr></thead>
                            <tbody>
                              {studentProfile.tickets.map((t: any) => (
                                <tr key={t.id}>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary-400)', fontSize: '0.8rem' }}>
                                    {t.referenceNo}{t.isDraft ? ' (draft)' : ''}
                                  </td>
                                  <td style={{ fontWeight: 600, maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</td>
                                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{fmt(t.categoryName)}</td>
                                  <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{fmt(t.departmentName)}</td>
                                  <td><span className={`badge badge-${t.priority ? t.priority.toLowerCase() : 'normal'}`}>{t.priority || 'NORMAL'}</span></td>
                                  <td><span className={`badge badge-${t.status ? t.status.toLowerCase() : 'new'}`}>{t.status}</span></td>
                                  <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(t.createdAt)}</td>
                                  <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{t.resolvedAt ? fmtDate(t.resolvedAt) : '—'}</td>
                                  <td>
                                    {t.feedbackRating ? (
                                      <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>★ {t.feedbackRating} / 5</span>
                                    ) : (
                                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </>
                )}
                {!studentProfile && !profileLoading && (
                  <div className="alert alert-info" style={{ marginTop: '0.5rem' }}>ℹ️ This student has no extended profile on record yet.</div>
                )}
              </div>
            )}

            {/* Non-student basic info */}
            {selectedUser.role !== 'STUDENT' && (
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>👤 Account Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  <InfoCard label="Full Name" value={selectedUser.fullName} />
                  <InfoCard label="Email" value={selectedUser.email} />
                  <InfoCard label="Phone" value={fmt(selectedUser.phone)} />
                  <InfoCard label="Department" value={fmt(selectedUser.departmentName)} />
                  <InfoCard label="Account Created" value={new Date(selectedUser.createdAt).toLocaleDateString('en-LK')} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Edit Modal ─────────────────── */}
      {editModal && selectedUser && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title" id="edit-user-title">✏️ Edit — {selectedUser.fullName}</h2>
              <button className="modal-close" onClick={() => setEditModal(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group mb-4">
                <label htmlFor="edit-fullname">Full Name</label>
                <input id="edit-fullname" type="text" value={editForm.fullName} required onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
              </div>
              <div className="form-group mb-4">
                <label htmlFor="edit-email">Email</label>
                <input id="edit-email" type="email" value={editForm.email} required onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="form-group mb-6">
                <label htmlFor="edit-phone">Phone</label>
                <input id="edit-phone" type="text" value={editForm.phone} placeholder="+94 7X XXX XXXX" onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ──────── */}
      {resetModal && resetTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title" id="reset-modal-title">🔑 Reset Password</h2>
              <button className="modal-close" onClick={() => setResetModal(false)} aria-label="Close">✕</button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Set a new password for <strong>{resetTarget.fullName}</strong> ({resetTarget.email}).
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group mb-6">
                <label htmlFor="reset-pwd">New Password</label>
                <input id="reset-pwd" type="password" required minLength={8} maxLength={72} placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary" disabled={resetting || !newPassword}>{resetting ? <><span className="spinner" /> Resetting…</> : 'Reset Password'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setResetModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────── */}
      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title" id="delete-modal-title" style={{ color: '#ef4444' }}>🗑️ Delete Account</h2>
              <button className="modal-close" onClick={() => setDeleteTarget(null)} aria-label="Close">✕</button>
            </div>
            <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Are you sure you want to <strong>permanently remove</strong> the account for <strong>{deleteTarget.fullName}</strong> ({deleteTarget.email})?
            </p>
            <div className="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              ⚠️ The account will be <strong>deactivated</strong>. All ticket history is preserved for auditing.
            </div>
            <div className="flex gap-3">
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? <><span className="spinner" /> Deleting…</> : '🗑️ Yes, Delete'}</button>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create User Modal ─────────── */}
      {createModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title" id="create-user-title">+ Create New User</h2>
              <button className="modal-close" onClick={() => setCreateModal(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              {[
                { id: 'nu-name', label: 'Full Name', key: 'fullName', type: 'text', required: true },
                { id: 'nu-email', label: 'Email Address', key: 'email', type: 'email', required: true },
                { id: 'nu-pwd', label: 'Password', key: 'password', type: 'password', required: true },
              ].map((f) => (
                <div className="form-group mb-4" key={f.id}>
                  <label htmlFor={f.id}>{f.label}</label>
                  <input id={f.id} type={f.type} required={f.required}
                    minLength={f.type === 'password' ? 8 : undefined} maxLength={f.type === 'password' ? 72 : undefined}
                    placeholder={f.type === 'password' ? 'Min 8 characters' : undefined}
                    value={(newUser as any)[f.key]} onChange={(e) => setNewUser({ ...newUser, [f.key]: e.target.value })} />
                </div>
              ))}
              <div className="form-group mb-4">
                <label htmlFor="nu-dept">Department (optional — required for Department Staff)</label>
                <select id="nu-dept" value={newUser.departmentId} onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}>
                  <option value="">— No department —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group mb-6">
                <label htmlFor="nu-role">Role</label>
                <select id="nu-role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? <><span className="spinner" /> Creating…</> : 'Create User'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Edit Student Record Modal ─── */}
      {studentEditModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="student-edit-modal-title">
          <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title" id="student-edit-modal-title">✏️ Edit Student Record — {selectedUser?.fullName}</h2>
              <button className="modal-close" onClick={() => setStudentEditModal(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleSaveStudentProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label>NIC Number</label>
                  <input type="text" required value={studentEditForm.nicNumber || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, nicNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" required max={today} value={studentEditForm.dateOfBirth || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, dateOfBirth: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={studentEditForm.gender || 'Male'} onChange={(e) => setStudentEditForm({ ...studentEditForm, gender: e.target.value })}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" required value={studentEditForm.city || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, city: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Address</label>
                  <input type="text" required value={studentEditForm.address || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Guardian Name</label>
                  <input type="text" required value={studentEditForm.guardianName || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, guardianName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Guardian Phone</label>
                  <input type="text" required value={studentEditForm.guardianPhone || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, guardianPhone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Guardian Relationship</label>
                  <input type="text" required value={studentEditForm.guardianRelationship || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, guardianRelationship: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Degree Programme</label>
                  <input type="text" required value={studentEditForm.degreeProgramme || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, degreeProgramme: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Faculty</label>
                  <input type="text" required value={studentEditForm.faculty || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, faculty: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Specialisation</label>
                  <input type="text" required value={studentEditForm.specialisation || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, specialisation: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Current Semester</label>
                  <input type="number" min={1} max={8} required value={studentEditForm.currentSemester || 1} onChange={(e) => setStudentEditForm({ ...studentEditForm, currentSemester: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <input type="text" required value={studentEditForm.academicYear || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, academicYear: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>CGPA</label>
                  <input type="number" step="0.01" min="0" max="4.00" required value={studentEditForm.cgpa || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, cgpa: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Scholarship Status</label>
                  <input type="text" required value={studentEditForm.scholarshipStatus || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, scholarshipStatus: e.target.value })} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!studentEditForm.hostelResident} onChange={(e) => setStudentEditForm({ ...studentEditForm, hostelResident: e.target.checked })} />
                    Hostel Resident
                  </label>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Medical Notes</label>
                  <input type="text" value={studentEditForm.medicalNotes || ''} onChange={(e) => setStudentEditForm({ ...studentEditForm, medicalNotes: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn btn-primary" disabled={savingStudent}>{savingStudent ? <><span className="spinner" /> Saving…</> : '💾 Save Student Record'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setStudentEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsersPage
