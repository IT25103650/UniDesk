import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Sidebar from "../../components/Sidebar"
import { StatusBadge, PriorityBadge } from "../../components/Badges"
import { deptApi } from "../../api/adminApi"
import { departmentResponseApi } from "../../api/departmentResponseApi"
import { ticketSubmissionApi } from "../../api/ticketSubmissionApi"
import { triageApi } from "../../api/triageApi"
import { useAuth } from "../../context/AuthContext"
import StudentProfileModal from "../../components/StudentProfileModal"
import { useDialog } from '../../components/ConfirmDialog'

const HelpdeskTicketDetail: React.FC = () => {
  const { confirm, dialog } = useDialog()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [ticket, setTicket]             = useState<any>(null)
  const [comments, setComments]         = useState<any[]>([])
  const [history, setHistory]           = useState<any[]>([])
  const [attachments, setAttachments]   = useState<any[]>([])
  const [departments, setDepartments]   = useState<any[]>([])

  const [assignDeptId, setAssignDeptId]   = useState<string>("")
  const [assignStaffId, setAssignStaffId] = useState<string>("")
  const [deptStaff, setDeptStaff]         = useState<any[]>([])
  const [loadingStaff, setLoadingStaff]   = useState(false)
  const [assigning, setAssigning]         = useState(false)

  const [note, setNote]                     = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const [showForward, setShowForward]     = useState(false)
  const [forwardDept, setForwardDept]     = useState("")
  const [forwardReason, setForwardReason] = useState("")

  const [commentText, setCommentText] = useState("")
  const [internal, setInternal]       = useState(false)
  const [sending, setSending]         = useState(false)

  const [pendingFile, setPendingFile]     = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const [triageNotes, setTriageNotes]         = useState<any[]>([])
  const [newTriageNote, setNewTriageNote]     = useState("")
  const [addingTriageNote, setAddingTriageNote] = useState(false)

  const [tags, setTags]         = useState<any[]>([])
  const [newTag, setNewTag]     = useState("")
  const [addingTag, setAddingTag] = useState(false)

  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState("")
  const [success, setSuccess]                   = useState("")
  const [showStudentModal, setShowStudentModal] = useState(false)

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t) } }, [success])
  useEffect(() => { if (error)   { const t = setTimeout(() => setError(""),   6000); return () => clearTimeout(t) } }, [error])

  const load = async () => {
    setLoading(true); setError("")
    try {
      const t = await ticketSubmissionApi.getById(Number(id))
      setTicket(t.data)
      const deptId  = t.data.departmentId
      const staffId = t.data.assignedToId
      setAssignDeptId(deptId  ? String(deptId)  : "")
      setAssignStaffId(staffId ? String(staffId) : "")
      if (deptId) { loadStaffForDept(deptId) }
      try {
        const [c, h, a, d, tn, tg] = await Promise.all([
          ticketSubmissionApi.getComments(Number(id)),
          ticketSubmissionApi.getHistory(Number(id)),
          ticketSubmissionApi.getAttachments(Number(id)),
          deptApi.getAll(true),
          triageApi.getTriageNotes(Number(id)),
          triageApi.getTags(Number(id)),
        ])
        setComments(c.data || [])
        setHistory(h.data || [])
        setAttachments(a.data || [])
        setDepartments(d.data || [])
        setTriageNotes(tn.data || [])
        setTags(tg.data || [])
      } catch (subErr) { console.warn("Sub-resource warning:", subErr) }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load ticket.")
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const loadStaffForDept = async (deptId: number | string) => {
    if (!deptId) { setDeptStaff([]); return }
    setLoadingStaff(true)
    try { const res = await deptApi.getStaff(Number(deptId)); setDeptStaff(res.data || []) }
    catch { setDeptStaff([]) }
    finally { setLoadingStaff(false) }
  }

  const handleDeptChange = (val: string) => {
    setAssignDeptId(val); setAssignStaffId(""); loadStaffForDept(val)
  }

  const doAssign = async () => {
    if (!assignDeptId) { setError("Please select a department first."); return }
    setAssigning(true)
    try {
      await triageApi.assign(Number(id), Number(assignDeptId), assignStaffId ? Number(assignStaffId) : undefined)
      setSuccess("Ticket assigned successfully.")
      await load()
    } catch (err: any) { setError(err?.response?.data?.message || "Failed to assign ticket.") }
    finally { setAssigning(false) }
  }

  const [unassigning, setUnassigning] = useState(false)
  const doUnassign = async () => {
    if (!(await confirm('Unassign this ticket? It will return to the unassigned help desk queue.', { title: 'Unassign ticket', confirmText: 'Unassign', danger: true }))) return
    setUnassigning(true)
    try {
      await triageApi.unassign(Number(id))
      setSuccess('Ticket unassigned and returned to the queue.')
      setAssignDeptId(''); setAssignStaffId('')
      await load()
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to unassign ticket.') }
    finally { setUnassigning(false) }
  }

  const setStatus = async (status: string) => {
    setUpdatingStatus(true)
    try {
      await departmentResponseApi.updateStatus(Number(id), status, note)
      setNote(""); setSuccess(`Status changed to ${status.replace("_", " ")}.`)
      await load()
    } catch { setError("Failed to update status.") }
    finally { setUpdatingStatus(false) }
  }

  const setPriority = async (priority: string) => {
    try { await triageApi.updatePriority(Number(id), priority); setSuccess(`Priority set to ${priority}.`); await load() }
    catch { setError("Failed to update priority.") }
  }

  const deleteInternalNote = async (commentId: number) => {
    if (!(await confirm('Delete this internal note? This cannot be undone.', { title: 'Delete internal note', confirmText: 'Delete', danger: true }))) return
    try {
      await departmentResponseApi.deleteComment(Number(id), commentId)
      setSuccess("Internal note deleted.")
      await load()
    } catch (err: any) { setError(err?.response?.data?.message || "Failed to delete internal note.") }
  }

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editingNoteText, setEditingNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  const startEditNote = (c: any) => { setEditingNoteId(c.id); setEditingNoteText(c.body) }
  const cancelEditNote = () => { setEditingNoteId(null); setEditingNoteText("") }

  const saveEditedNote = async (commentId: number) => {
    if (!editingNoteText.trim()) return
    setSavingNote(true)
    try {
      await departmentResponseApi.updateComment(Number(id), commentId, editingNoteText)
      setSuccess("Internal note updated.")
      cancelEditNote()
      await load()
    } catch (err: any) { setError(err?.response?.data?.message || "Failed to update internal note.") }
    finally { setSavingNote(false) }
  }

  const forward = async () => {
    if (!forwardDept || !forwardReason.trim()) return
    try {
      await triageApi.forward(Number(id), Number(forwardDept), forwardReason)
      setForwardReason(""); setForwardDept(""); setShowForward(false)
      setSuccess("Ticket forwarded."); await load()
    } catch { setError("Failed to forward ticket.") }
  }

  const reopen = async () => {
    try { await triageApi.reopen(Number(id)); setSuccess("Ticket reopened."); await load() }
    catch { setError("Failed to reopen ticket.") }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSending(true)
    try { await departmentResponseApi.addComment(Number(id), commentText, internal); setCommentText(""); await load() }
    catch { setError("Failed to send comment.") }
    finally { setSending(false) }
  }

  const uploadFile = async () => {
    if (!pendingFile) return
    setUploadingFile(true)
    try { await ticketSubmissionApi.uploadAttachment(Number(id), pendingFile); setPendingFile(null); setSuccess("File uploaded."); await load() }
    catch { setError("Failed to upload file.") }
    finally { setUploadingFile(false) }
  }

  const deleteFile = async (fileId: number) => {
    if (!(await confirm('Delete this attachment?', { title: 'Delete attachment', confirmText: 'Delete', danger: true }))) return
    try { await ticketSubmissionApi.deleteAttachment(Number(id), fileId); await load() }
    catch { setError("Failed to delete attachment.") }
  }

  const downloadFile = async (fileId: number, fileName: string) => {
    try {
      const res = await ticketSubmissionApi.downloadAttachment(Number(id), fileId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError("Failed to download file.")
    }
  }

  const addTriageNote = async () => {
    if (!newTriageNote.trim()) return
    setAddingTriageNote(true)
    try {
      await triageApi.addTriageNote(Number(id), newTriageNote)
      setNewTriageNote(""); setSuccess("Triage note added.")
      await load()
    } catch (err: any) { setError(err?.response?.data?.message || "Failed to add triage note.") }
    finally { setAddingTriageNote(false) }
  }

  const deleteTriageNote = async (noteId: number) => {
    if (!(await confirm('Delete this triage note? This cannot be undone.', { title: 'Delete triage note', confirmText: 'Delete', danger: true }))) return
    try {
      await triageApi.deleteTriageNote(Number(id), noteId)
      setSuccess("Triage note deleted.")
      await load()
    } catch (err: any) { setError(err?.response?.data?.message || "Failed to delete triage note.") }
  }

  const addTag = async (label: string) => {
    const clean = label.trim()
    if (!clean) return
    setAddingTag(true)
    try {
      const res = await triageApi.addTag(Number(id), clean)
      setTags((ts) => [...ts, res.data]); setNewTag("")
    } catch (err: any) { setError(err?.response?.data?.message || "Failed to add tag.") }
    finally { setAddingTag(false) }
  }

  const removeTag = async (tag: any) => {
    if (!(await confirm(`Remove the tag "${tag.label}" from this ticket?`, { title: "Remove tag", confirmText: "Remove", danger: true }))) return
    try {
      await triageApi.deleteTag(Number(id), tag.id)
      setTags((ts) => ts.filter((t) => t.id !== tag.id))
    } catch (err: any) { setError(err?.response?.data?.message || "Failed to remove tag.") }
  }

  if (loading) return <div className="page-layout"><Sidebar /><main className="main-content"><div className="loading-screen"><span className="spinner spinner-lg" /></div></main></div>
  if (!ticket)  return <div className="page-layout"><Sidebar /><main className="main-content"><div className="empty-state"><div className="empty-icon">🔍</div><p className="empty-title">Ticket not found</p><button className="btn btn-secondary mt-4" onClick={() => navigate(-1)}>Back</button></div></main></div>

  const isOverdue = ticket.dueDate && !["RESOLVED","CLOSED"].includes(ticket.status) && new Date(ticket.dueDate) < new Date()

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        {error   && <div className="alert alert-danger mb-4"  role="alert">⚠️ {error}   <button className="btn btn-ghost btn-sm" style={{ float:"right" }} onClick={() => setError("")}>✕</button></div>}
        {success && <div className="alert alert-success mb-4" role="status">✅ {success} <button className="btn btn-ghost btn-sm" style={{ float:"right" }} onClick={() => setSuccess("")}>✕</button></div>}

        <div className="page-header">
          <div>
            <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="page-title" style={{ fontSize:"1.4rem" }}>{ticket.subject}</h1>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", flexWrap:"wrap", marginTop:"0.25rem" }}>
              <code style={{ color:"var(--color-primary-400)", fontSize:"0.85rem" }}>{ticket.referenceNo}</code>
              <span style={{ color:"var(--color-text-muted)", fontSize:"0.8rem" }}>by {ticket.studentName}</span>
              {isOverdue && <span className="badge badge-urgent" style={{ fontSize:"0.7rem" }}>⏱ OVERDUE</span>}
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:"1.5rem" }}>

          {/* LEFT */}
          <div>
            <div className="card mb-4">
              <h2 style={{ fontSize:"1rem", marginBottom:"1rem" }}>📋 Description</h2>
              <p style={{ whiteSpace:"pre-wrap", color:"var(--color-text-secondary)", lineHeight:1.7 }}>{ticket.description}</p>
            </div>

            <div className="card mb-4">
              <h2 style={{ fontSize:"1rem", marginBottom:"1rem" }}>💬 Conversation</h2>
              <div className="comment-thread">
                {comments.length === 0 && <p style={{ color:"var(--color-text-muted)", fontSize:"0.9rem" }}>No messages yet.</p>}
                {comments.map((c) => (
                  <div key={c.id} className={`comment-body ${c.internal ? "comment-internal" : ""}`} style={{ marginBottom:"1rem" }}>
                    <div className="comment-meta">
                      <span className="comment-author">{c.authorName}</span>
                      {" · "}<span style={{ color:"var(--color-text-muted)", fontSize:"0.8rem" }}>{c.authorRole.replace(/_/g," ")}</span>
                      {" · "}<span style={{ fontSize:"0.75rem", color:"var(--color-text-muted)" }}>{new Date(c.createdAt).toLocaleString()}</span>
                      {c.internal && <span style={{ color:"var(--color-warning)", marginLeft:8, fontSize:"0.75rem" }}>🔒 Staff only</span>}
                      {c.updatedAt && <span style={{ fontStyle: "italic", fontSize: "0.72rem", color: "var(--color-text-muted)", marginLeft: 8 }}>(edited)</span>}
                    </div>
                    {editingNoteId === c.id ? (
                      <div>
                        <textarea rows={3} value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)}
                          style={{ marginBottom: "0.5rem" }} aria-label="Edit internal note" />
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEditedNote(c.id)} disabled={savingNote || !editingNoteText.trim()}>
                            {savingNote ? <><span className="spinner" /> Saving…</> : "Save"}
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEditNote}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="comment-text">{c.body}</p>
                        {c.internal && (c.authorId === user?.userId || user?.role === "ADMIN") && (
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: "0.72rem", padding: "0.15rem 0.4rem" }}
                              onClick={() => startEditNote(c)}
                            >
                              ✏️ Edit Note
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: "var(--color-danger)", fontSize: "0.72rem", padding: "0.15rem 0.4rem" }}
                              onClick={() => deleteInternalNote(c.id)}
                            >
                              🗑 Delete Note
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              {ticket.status !== "CLOSED" && (
                <form onSubmit={submitComment} className="mt-4">
                  <div className="form-group mb-3">
                    <label htmlFor="hd-reply">Reply</label>
                    <textarea id="hd-reply" rows={3} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a reply…" />
                  </div>
                  <label style={{ display:"flex", gap:"0.5rem", alignItems:"center", fontSize:"0.875rem", cursor:"pointer", marginBottom:"0.75rem" }}>
                    <input type="checkbox" style={{ width:"auto" }} checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    Internal note (not visible to student)
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={sending || !commentText.trim()}>
                    {sending ? <><span className="spinner" /> Sending…</> : "📤 Send"}
                  </button>
                </form>
              )}
              {ticket.status === "CLOSED" && <div className="alert alert-info mt-4">Ticket is closed — no further replies.</div>}
            </div>

            <div className="card">
              <h2 style={{ fontSize:"1rem", marginBottom:"1rem" }}>📎 Attachments</h2>
              {attachments.length === 0
                ? <p style={{ color:"var(--color-text-muted)", fontSize:"0.9rem" }}>No attachments.</p>
                : <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                    {attachments.map((a) => (
                      <li key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.5rem 0", borderBottom:"1px solid var(--color-border)" }}>
                        <span style={{ fontSize:"0.875rem" }}>📄 {a.originalName}</span>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(a.id, a.originalName)}>Download</button>
                          <button className="btn btn-ghost btn-sm" style={{ color:"var(--color-danger)" }} onClick={() => deleteFile(a.id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
              }
              {ticket.status !== "CLOSED" && (
                <div className="mt-4">
                  <label htmlFor="hd-file-upload" className="btn btn-secondary btn-sm" style={{ cursor:"pointer" }}>📎 Attach File</label>
                  <input id="hd-file-upload" type="file" style={{ display:"none" }} onChange={(e) => setPendingFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" />
                  {pendingFile && (
                    <div className="mt-3 flex gap-3 items-center">
                      <span style={{ fontSize:"0.85rem", color:"var(--color-text-secondary)" }}>{pendingFile.name}</span>
                      <button className="btn btn-primary btn-sm" onClick={uploadFile} disabled={uploadingFile}>
                        {uploadingFile ? <><span className="spinner" /> Uploading…</> : "Upload"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div>
            {/* Student card */}
            <div className="card mb-4" style={{ background:"linear-gradient(135deg,rgba(54,210,250,0.08),var(--color-surface))", border:"1px solid var(--color-primary-500)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.85rem" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,var(--color-primary-500),var(--color-primary-700))", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.9rem", flexShrink:0 }}>
                  {ticket.studentName ? ticket.studentName.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase() : "ST"}
                </div>
                <div>
                  <h3 style={{ fontSize:"0.95rem", fontWeight:700, margin:0 }}>{ticket.studentName || "Student"}</h3>
                  <span style={{ fontSize:"0.75rem", color:"var(--color-text-muted)", fontFamily:"var(--font-mono)" }}>{ticket.studentIdentifier || `ID #${ticket.studentId}`}</span>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem", fontSize:"0.82rem", borderTop:"1px solid var(--color-border)", paddingTop:"0.75rem" }}>
                <div>✉️ <a href={`mailto:${ticket.studentEmail}`} style={{ color:"var(--color-primary-400)", wordBreak:"break-all" }}>{ticket.studentEmail}</a></div>
                {ticket.studentPhone && <div>📞 <a href={`tel:${ticket.studentPhone}`} style={{ color:"var(--color-text-secondary)" }}>{ticket.studentPhone}</a></div>}
              </div>
              <button type="button" className="btn btn-secondary btn-sm mt-3 w-full" style={{ fontSize:"0.78rem", justifyContent:"center" }} onClick={() => setShowStudentModal(true)}>
                👤 View Full Student Record
              </button>
            </div>

            {/* ASSIGN TICKET */}
            <div className="card mb-4">
              <h3 style={{ fontSize:"0.85rem", color:"var(--color-text-muted)", marginBottom:"1rem" }}>🏢 ASSIGN TICKET</h3>
              {(ticket.departmentName || ticket.assignedToName) && (
                <div style={{ background:"rgba(37,147,175,0.08)", borderRadius:"var(--radius-sm)", padding:"0.5rem 0.75rem", marginBottom:"0.75rem", fontSize:"0.8rem" }}>
                  {ticket.departmentName && <div>🏢 <strong>{ticket.departmentName}</strong></div>}
                  {ticket.assignedToName
                    ? <div>👤 <strong>{ticket.assignedToName}</strong></div>
                    : <div style={{ color:"var(--color-text-muted)" }}>👤 No specific staff assigned</div>}
                </div>
              )}
              <div className="form-group mb-3">
                <label htmlFor="assign-dept" style={{ fontSize:"0.8rem" }}>Department *</label>
                <select id="assign-dept" value={assignDeptId} onChange={(e) => handleDeptChange(e.target.value)}>
                  <option value="">— Select department —</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {assignDeptId && (
                <div className="form-group mb-3">
                  <label htmlFor="assign-staff" style={{ fontSize:"0.8rem" }}>
                    Assign To (optional)
                    {loadingStaff && <span className="spinner" style={{ width:12, height:12, marginLeft:6, display:"inline-block" }} />}
                  </label>
                  <select id="assign-staff" value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value)} disabled={loadingStaff}>
                    <option value="">— Any available staff —</option>
                    {deptStaff.map((s: any) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  </select>
                  {!loadingStaff && deptStaff.length === 0 && (
                    <p style={{ fontSize:"0.75rem", color:"var(--color-warning)", marginTop:4 }}>⚠ No staff found in this department.</p>
                  )}
                </div>
              )}
              <button className="btn btn-primary w-full" onClick={doAssign} disabled={assigning || !assignDeptId}>
                {assigning ? <><span className="spinner" /> Assigning…</> : "✅ Confirm Assignment"}
              </button>
              {(ticket.departmentName || ticket.assignedToName) && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status) && (
                <button className="btn btn-ghost w-full mt-2" style={{ color: 'var(--color-danger)' }} onClick={doUnassign} disabled={unassigning}>
                  {unassigning ? <><span className="spinner" /> Unassigning…</> : "↩ Unassign Ticket"}
                </button>
              )}
            </div>

            {/* TAGS (Module 2) */}
            <div className="card mb-4">
              <h3 style={{ fontSize:"0.85rem", color:"var(--color-text-muted)", marginBottom:"0.75rem" }}>🏷️ TAGS</h3>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem", marginBottom:"0.75rem" }}>
                {tags.length === 0 && <span style={{ color:"var(--color-text-muted)", fontSize:"0.8rem" }}>No tags yet.</span>}
                {tags.map((t) => (
                  <span key={t.id} className="badge badge-new" style={{ display:"inline-flex", alignItems:"center", gap:"0.35rem" }}>
                    {t.label}
                    <button type="button" aria-label={`Remove tag ${t.label}`} onClick={() => removeTag(t)}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:0, color:"var(--color-danger)", fontSize:"0.8rem" }}>✕</button>
                  </span>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addTag(newTag) }} style={{ display:"flex", gap:"0.5rem" }}>
                <input type="text" placeholder="Add a tag…" maxLength={40} value={newTag}
                  aria-label="New tag" onChange={(e) => setNewTag(e.target.value)} />
                <button type="submit" className="btn btn-secondary btn-sm" disabled={addingTag || !newTag.trim()}>Add</button>
              </form>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.35rem", marginTop:"0.5rem" }}>
                {["Duplicate", "Needs info", "Follow-up", "VIP"]
                  .filter((s) => !tags.some((t) => t.label.toLowerCase() === s.toLowerCase()))
                  .map((s) => (
                    <button key={s} type="button" className="btn btn-ghost btn-sm" style={{ fontSize:"0.72rem", padding:"0.1rem 0.45rem" }}
                      onClick={() => addTag(s)} disabled={addingTag}>+ {s}</button>
                  ))}
              </div>
            </div>
            {/* TRIAGE NOTES */}
            <div className="card mb-4">
              <h3 style={{ fontSize:"0.85rem", color:"var(--color-text-muted)", marginBottom:"1rem" }}>📝 TRIAGE NOTES</h3>
              <p style={{ fontSize:"0.75rem", color:"var(--color-text-muted)", marginTop:-8, marginBottom:"0.75rem" }}>
                Visible only to Help Desk / Admin — separate from the conversation thread.
              </p>
              {triageNotes.length === 0 && <p style={{ color:"var(--color-text-muted)", fontSize:"0.8rem" }}>No triage notes yet.</p>}
              {triageNotes.map((n) => (
                <div key={n.id} style={{ marginBottom:"0.75rem", fontSize:"0.82rem", borderLeft:"2px solid var(--color-primary-500)", paddingLeft:"0.75rem" }}>
                  <p style={{ margin:0 }}>{n.note}</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2 }}>
                    <span style={{ color:"var(--color-text-muted)", fontSize:"0.72rem" }}>{n.authorName} · {new Date(n.createdAt).toLocaleString()}</span>
                    {(n.authorId === user?.userId || user?.role === "ADMIN") && (
                      <button type="button" className="btn btn-ghost btn-sm" style={{ color:"var(--color-danger)", fontSize:"0.7rem", padding:"0.1rem 0.35rem" }} onClick={() => deleteTriageNote(n.id)}>
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <textarea rows={2} placeholder="Add a triage note…" value={newTriageNote} onChange={(e) => setNewTriageNote(e.target.value)} style={{ marginBottom:"0.5rem" }} />
              <button className="btn btn-secondary btn-sm w-full" onClick={addTriageNote} disabled={addingTriageNote || !newTriageNote.trim()}>
                {addingTriageNote ? <><span className="spinner" /> Adding…</> : "➕ Add Triage Note"}
              </button>
            </div>

            {/* STATUS */}
            <div className="card mb-4">
              <h3 style={{ fontSize:"0.85rem", color:"var(--color-text-muted)", marginBottom:"1rem" }}>🔄 UPDATE STATUS</h3>
              <div className="form-group mb-3">
                <label htmlFor="status-note" style={{ fontSize:"0.8rem" }}>Note (optional)</label>
                <input id="status-note" type="text" placeholder="Reason for status change" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                {["NEW","ASSIGNED","IN_PROGRESS","RESOLVED","CLOSED"].map((s) => (
                  <button key={s} className={`btn btn-sm ${ticket.status === s ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setStatus(s)} disabled={updatingStatus || ticket.status === s}>
                    {s.replace("_"," ")}
                  </button>
                ))}
              </div>
              {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
                <button className="btn btn-secondary w-full mt-3" onClick={reopen}>🔄 Reopen Ticket</button>
              )}
            </div>

            {/* PRIORITY */}
            <div className="card mb-4">
              <h3 style={{ fontSize:"0.85rem", color:"var(--color-text-muted)", marginBottom:"1rem" }}>🎯 SET PRIORITY</h3>
              <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                {["LOW","NORMAL","HIGH","URGENT"].map((p) => (
                  <button key={p} className={`btn btn-sm ${ticket.priority === p ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setPriority(p)}>{p}
                  </button>
                ))}
              </div>
            </div>

            {/* FORWARD */}
            <div className="card mb-4">
              <h3 style={{ fontSize:"0.85rem", color:"var(--color-text-muted)", marginBottom:"1rem" }}>➡️ FORWARD TICKET</h3>
              {!showForward ? (
                <button className="btn btn-secondary w-full" onClick={() => setShowForward(true)}>➡️ Forward to Another Dept</button>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                  <select value={forwardDept} onChange={(e) => setForwardDept(e.target.value)}>
                    <option value="">— Select department —</option>
                    {departments.filter((d: any) => d.id !== ticket.departmentId).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <textarea rows={2} required placeholder="Reason for forwarding (required)" value={forwardReason} onChange={(e) => setForwardReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={forward} disabled={!forwardDept || !forwardReason.trim()}>Confirm</button>
                    <button className="btn btn-secondary" onClick={() => setShowForward(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* STATUS HISTORY */}
            <div className="card">
              <h3 style={{ fontSize:"0.85rem", color:"var(--color-text-muted)", marginBottom:"1rem" }}>📜 STATUS HISTORY</h3>
              {history.length === 0 && <p style={{ color:"var(--color-text-muted)", fontSize:"0.8rem" }}>No history yet.</p>}
              {history.map((h) => (
                <div key={h.id} style={{ marginBottom:"0.85rem", fontSize:"0.8rem", borderLeft:"2px solid var(--color-border)", paddingLeft:"0.75rem" }}>
                  <div style={{ fontWeight:600, color:"var(--color-text-primary)" }}>
                    {h.oldStatus ? `${h.oldStatus} → ` : ""}{h.newStatus}
                  </div>
                  <div style={{ color:"var(--color-text-muted)", marginTop:2 }}>{new Date(h.changedAt).toLocaleString()}</div>
                  {h.note && <div style={{ color:"var(--color-text-secondary)", marginTop:2, fontStyle:"italic" }}>"{h.note}"</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <StudentProfileModal
          isOpen={showStudentModal}
          onClose={() => setShowStudentModal(false)}
          studentUserId={ticket?.studentId}
          studentName={ticket?.studentName}
          studentIdentifier={ticket?.studentIdentifier}
          studentEmail={ticket?.studentEmail}
          studentPhone={ticket?.studentPhone}
        />
        {dialog}
      </main>
    </div>
  )
}

export default HelpdeskTicketDetail
