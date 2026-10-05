import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const ProfilePage: React.FC = () => {
  const { user, login } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [updating, setUpdating] = useState(false)

  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' })
  const [pwdUpdating, setPwdUpdating] = useState(false)

  const loadProfile = async () => {
    try {
      const res = await api.get('/users/me')
      setProfile(res.data)
      setForm({ fullName: res.data.fullName || '', phone: res.data.phone || '' })
    } catch {
      setError('Failed to load profile details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError(''); setSuccess('')
    try {
      const res = await api.put('/users/me', form)
      setProfile(res.data)
      setSuccess('Profile updated successfully.')

      // Keep the cached auth user (Sidebar/nav, and localStorage on reload) in sync —
      // otherwise the name shown there reverts to the stale pre-edit value after refresh.
      if (user) {
        login({ ...user, fullName: res.data.fullName })
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setUpdating(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdUpdating(true)
    setError(''); setSuccess('')
    try {
      await api.put('/users/me/password', pwdForm)
      setSuccess('Password changed successfully.')
      setPwdForm({ currentPassword: '', newPassword: '' })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password.')
    } finally {
      setPwdUpdating(false)
    }
  }

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your personal information and account security.</p>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-4" role="alert">⚠️ {error}</div>}
        {success && <div className="alert alert-success mb-4" role="alert">✅ {success}</div>}

        {loading ? (
          <div className="loading-screen"><span className="spinner spinner-lg" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            
            {/* Profile Info Form */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Personal Information</h2>
              <form onSubmit={updateProfile}>
                <div className="form-group mb-4">
                  <label htmlFor="email">Email (Read Only)</label>
                  <input id="email" type="email" value={profile?.email || ''} disabled style={{ backgroundColor: 'var(--color-surface-2)' }} />
                </div>
                <div className="form-group mb-4">
                  <label htmlFor="role">Role (Read Only)</label>
                  <input id="role" type="text" value={profile?.role?.replace(/_/g, ' ') || ''} disabled style={{ backgroundColor: 'var(--color-surface-2)' }} />
                </div>
                {profile?.department && (
                  <div className="form-group mb-4">
                    <label htmlFor="dept">Department (Read Only)</label>
                    <input id="dept" type="text" value={profile?.department?.name || ''} disabled style={{ backgroundColor: 'var(--color-surface-2)' }} />
                  </div>
                )}
                
                <hr className="divider my-4" />
                
                <div className="form-group mb-4">
                  <label htmlFor="fullName">Full Name</label>
                  <input id="fullName" type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required />
                </div>
                <div className="form-group mb-4">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                
                <button type="submit" className="btn btn-primary mt-2" disabled={updating}>
                  {updating ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
                </button>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="card" style={{ height: 'fit-content' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Change Password</h2>
              <form onSubmit={changePassword}>
                <div className="form-group mb-4">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input id="currentPassword" type="password" value={pwdForm.currentPassword} 
                    onChange={e => setPwdForm({...pwdForm, currentPassword: e.target.value})} required />
                </div>
                <div className="form-group mb-4">
                  <label htmlFor="newPassword">New Password</label>
                  <input id="newPassword" type="password" value={pwdForm.newPassword} 
                    onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})} required minLength={8} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Minimum 8 characters.</span>
                </div>
                
                <button type="submit" className="btn btn-secondary mt-2" disabled={pwdUpdating || !pwdForm.currentPassword || !pwdForm.newPassword}>
                  {pwdUpdating ? <><span className="spinner" /> Updating…</> : 'Change Password'}
                </button>
              </form>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}

export default ProfilePage
