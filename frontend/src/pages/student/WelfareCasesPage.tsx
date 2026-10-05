import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge } from '../../components/Badges'
import { welfareApi } from '../../api/welfareApi'

const WelfareCasesPage: React.FC = () => {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    welfareApi.getMyCases(0, 20)
      .then((r) => setCases(r.data.content || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">🛡 My Welfare Cases</h1>
            <p className="page-subtitle">
              Welfare cases are private and confidential — visible only to you and assigned welfare officers.
            </p>
          </div>
          <Link to="/student/welfare/new" className="btn btn-primary" style={{ background: 'var(--color-welfare)', borderColor: 'var(--color-welfare)' }}>
            + New Welfare Case
          </Link>
        </div>

        <div className="alert alert-info mb-6" role="note">
          🔒 Your privacy is protected. Only you and your assigned Welfare Officer can see these cases.
          They are completely separate from general help desk tickets.
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛡</div>
              <p className="empty-title">No welfare cases</p>
              <p className="empty-desc">You haven't submitted any welfare cases. Your well-being matters to us.</p>
              <Link to="/student/welfare/new" className="btn btn-primary mt-4">Submit a welfare case</Link>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table" aria-label="My welfare cases">
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Status</th>
                    <th scope="col">Urgent</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id}>
                      <td><code style={{ color: 'var(--color-welfare)', fontSize: '0.8rem' }}>{c.referenceNo}</code></td>
                      <td>{c.subject}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>
                        {c.urgent
                          ? <span className="badge badge-urgent">🔴 URGENT</span>
                          : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <Link to={`/student/welfare/${c.id}`} className="btn btn-ghost btn-sm">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default WelfareCasesPage
