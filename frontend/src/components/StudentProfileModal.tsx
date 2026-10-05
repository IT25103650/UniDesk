import React, { useEffect, useState } from 'react'
import { studentApi } from '../api/adminApi'

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

type TabType = 'personal' | 'academic' | 'fees' | 'exams' | 'tickets'

interface StudentProfileModalProps {
  isOpen: boolean
  onClose: () => void
  studentUserId: number | null
  studentName?: string
  studentIdentifier?: string
  studentEmail?: string
  studentPhone?: string
}

const InfoCard: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div style={{ background: 'var(--color-surface-2)', borderRadius: 8, padding: '0.75rem 1rem' }}>
    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: '0.9rem', fontWeight: 500, wordBreak: 'break-word', color: 'var(--color-text-primary)' }}>
      {value ?? '—'}
    </div>
  </div>
)

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  studentUserId,
  studentName,
  studentIdentifier,
  studentEmail,
  studentPhone,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('personal')
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && studentUserId) {
      setActiveTab('personal')
      setLoading(true)
      studentApi
        .getProfile(studentUserId)
        .then((res) => {
          setProfile(res.data)
        })
        .catch((err) => {
          console.warn('Could not load extended student profile:', err)
          setProfile(null)
        })
        .finally(() => setLoading(false))
    } else {
      setProfile(null)
    }
  }, [isOpen, studentUserId])

  if (!isOpen) return null

  const displayName = profile?.fullName || studentName || 'Student Profile'
  const displayId = profile?.studentId || studentIdentifier || '—'
  const displayEmail = profile?.email || studentEmail
  const displayPhone = profile?.phone || studentPhone

  const fmt = (val: any) => val ?? '—'
  const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('en-LK') : '—')
  const fmtCurrency = (val: any) =>
    val != null ? `LKR ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="student-profile-modal-title" style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 840, width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.2rem',
                flexShrink: 0,
              }}
            >
              {displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 className="modal-title" id="student-profile-modal-title" style={{ margin: 0, fontSize: '1.2rem' }}>
                  {displayName}
                </h2>
                <span className="badge badge-assigned" style={{ fontSize: '0.72rem' }}>
                  STUDENT
                </span>
                {profile?.currentSemester && (
                  <span className="badge badge-inprogress" style={{ fontSize: '0.72rem' }}>
                    Semester {profile.currentSemester}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                🎓 ID: <strong style={{ color: 'var(--color-text-primary)' }}>{displayId}</strong>
                {displayEmail && ` · ✉️ ${displayEmail}`}
                {displayPhone && ` · 📞 ${displayPhone}`}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
          {([
            { key: 'personal', label: '👤 Personal Info' },
            { key: 'academic', label: '🎓 Academic Details' },
            { key: 'fees', label: '💳 Semester Fees' },
            { key: 'exams', label: '📝 Exam Results' },
            { key: 'tickets', label: `🎫 Ticket History (${profile?.tickets?.length ?? 0})` },
          ] as { key: TabType; label: string }[]).map((t) => (
            <button
              key={t.key}
              className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(t.key)}
              style={{ fontWeight: 600, fontSize: '0.82rem' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0' }}>
          {loading ? (
            <div className="loading-screen" style={{ minHeight: 200 }}>
              <span className="spinner spinner-lg" />
            </div>
          ) : (
            <>
              {/* Tab 1: Personal Details */}
              {activeTab === 'personal' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  <InfoCard label="Full Name" value={displayName} />
                  <InfoCard label="Email" value={displayEmail} />
                  <InfoCard label="Phone" value={displayPhone} />
                  <InfoCard label="Student Registration ID" value={displayId} />
                  <InfoCard label="National Identity Card (NIC)" value={fmt(profile?.nicNumber)} />
                  <InfoCard label="Date of Birth" value={fmtDate(profile?.dateOfBirth)} />
                  <InfoCard label="Gender" value={fmt(profile?.gender)} />
                  <InfoCard label="City / Hometown" value={fmt(profile?.city)} />
                  <InfoCard label="Residential Address" value={fmt(profile?.address)} />
                  <InfoCard label="Parent / Guardian Name" value={fmt(profile?.guardianName)} />
                  <InfoCard label="Guardian Phone" value={fmt(profile?.guardianPhone)} />
                  <InfoCard label="Guardian Relationship" value={fmt(profile?.guardianRelationship)} />
                  <InfoCard label="Hostel / Campus Resident" value={profile?.hostelResident ? '✅ Yes' : '❌ No'} />
                  <InfoCard label="Medical Notes / Special Needs" value={fmt(profile?.medicalNotes)} />
                </div>
              )}

              {/* Tab 2: Academic Details */}
              {activeTab === 'academic' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  <InfoCard label="Degree Programme" value={fmt(profile?.degreeProgramme)} />
                  <InfoCard label="Faculty" value={fmt(profile?.faculty)} />
                  <InfoCard label="Specialisation / Major" value={fmt(profile?.specialisation)} />
                  <InfoCard label="Intake Year" value={fmt(profile?.intakeYear)} />
                  <InfoCard label="Intake Month / Batch" value={fmt(profile?.intakeMonth)} />
                  <InfoCard label="Current Semester" value={profile?.currentSemester ? `Semester ${profile.currentSemester}` : '—'} />
                  <InfoCard label="Current Academic Year" value={fmt(profile?.academicYear)} />
                  <InfoCard label="Cumulative GPA (CGPA)" value={profile?.cgpa ? `${profile.cgpa} / 4.00` : '—'} />
                  <InfoCard label="Scholarship / Financial Aid" value={fmt(profile?.scholarshipStatus)} />
                </div>
              )}

              {/* Tab 3: Semester Fees */}
              {activeTab === 'fees' && (
                <div>
                  {!profile?.fees || profile.fees.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <div className="empty-icon">💳</div>
                      <p className="empty-title">No fee records found</p>
                      <p className="empty-desc">No semester fee payment records have been uploaded for this student.</p>
                    </div>
                  ) : (
                    <div className="data-table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Academic Year</th>
                            <th>Semester</th>
                            <th>Total Fee</th>
                            <th>Paid Amount</th>
                            <th>Balance</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.fees.map((fee: any) => {
                            const balance = Number(fee.totalFee) - Number(fee.paidAmount)
                            return (
                              <tr key={fee.id}>
                                <td style={{ fontWeight: 600 }}>{fee.academicYear}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>Sem {fee.semester}</td>
                                <td style={{ fontWeight: 700 }}>{fmtCurrency(fee.totalFee)}</td>
                                <td style={{ color: 'var(--color-resolved)', fontWeight: 600 }}>{fmtCurrency(fee.paidAmount)}</td>
                                <td style={{ color: balance > 0 ? 'var(--color-urgent)' : 'var(--color-resolved)', fontWeight: 700 }}>
                                  {fmtCurrency(balance)}
                                </td>
                                <td style={{ fontSize: '0.82rem' }}>{fmtDate(fee.dueDate)}</td>
                                <td>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '0.2rem 0.6rem',
                                      borderRadius: 20,
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: `${FEE_STATUS_COLOR[fee.status] || 'gray'}22`,
                                      color: FEE_STATUS_COLOR[fee.status] || 'inherit',
                                    }}
                                  >
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
                  )}
                </div>
              )}

              {/* Tab 4: Exam Results */}
              {activeTab === 'exams' && (
                <div>
                  {!profile?.exams || profile.exams.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <div className="empty-icon">📝</div>
                      <p className="empty-title">No exam records found</p>
                      <p className="empty-desc">No examination / module grades have been recorded for this student yet.</p>
                    </div>
                  ) : (
                    <div className="data-table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Academic Year</th>
                            <th>Sem</th>
                            <th>Code</th>
                            <th>Module Name</th>
                            <th style={{ textAlign: 'center' }}>Credits</th>
                            <th style={{ textAlign: 'center' }}>Grade</th>
                            <th style={{ textAlign: 'center' }}>GPA Pts</th>
                            <th>Result</th>
                            <th>Exam Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.exams.map((ex: any) => (
                            <tr key={ex.id}>
                              <td>{ex.academicYear}</td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{ex.semester}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem' }}>{ex.moduleCode}</td>
                              <td style={{ fontWeight: 500 }}>{ex.moduleName}</td>
                              <td style={{ textAlign: 'center' }}>{ex.credits ?? '—'}</td>
                              <td
                                style={{
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  fontSize: '1rem',
                                  color: ex.result === 'PASS' ? 'var(--color-resolved)' : ex.result === 'FAIL' ? '#ef4444' : 'inherit',
                                }}
                              >
                                {ex.grade ?? '—'}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{ex.gradePoints ?? '—'}</td>
                              <td>
                                {ex.result && (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: 20,
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: `${RESULT_COLOR[ex.result] || 'gray'}22`,
                                      color: RESULT_COLOR[ex.result] || 'inherit',
                                    }}
                                  >
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
                  )}
                </div>
              )}

              {/* Tab 5: Ticket History — every ticket this student has ever raised,
                  regardless of status, so staff can see the full pattern of contact. */}
              {activeTab === 'tickets' && (
                <div>
                  {!profile?.tickets || profile.tickets.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <div className="empty-icon">🎫</div>
                      <p className="empty-title">No tickets found</p>
                      <p className="empty-desc">This student has not raised any help desk tickets yet.</p>
                    </div>
                  ) : (
                    <div className="data-table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Ref #</th>
                            <th>Subject</th>
                            <th>Category</th>
                            <th>Department</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Resolved</th>
                            <th>Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.tickets.map((t: any) => (
                            <tr key={t.id}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary-400)', fontSize: '0.8rem' }}>
                                {t.referenceNo}{t.isDraft ? ' (draft)' : ''}
                              </td>
                              <td style={{ fontWeight: 600, maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t.subject}
                              </td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{fmt(t.categoryName)}</td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{fmt(t.departmentName)}</td>
                              <td>
                                <span className={`badge badge-${t.priority ? t.priority.toLowerCase() : 'normal'}`}>
                                  {t.priority || 'NORMAL'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge badge-${t.status ? t.status.toLowerCase() : 'new'}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                {fmtDate(t.createdAt)}
                              </td>
                              <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                {t.resolvedAt ? fmtDate(t.resolvedAt) : '—'}
                              </td>
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
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentProfileModal
