import React, { useState } from 'react'
import Sidebar from '../../components/Sidebar'

interface FAQItem {
  q: string
  a: string
  category: string
}

const faqs: FAQItem[] = [
  // Tickets
  {
    category: 'Tickets',
    q: 'How do I submit a new ticket?',
    a: 'Click "Submit Ticket" in the sidebar, choose a category, fill in the subject and description, optionally attach a file, and click Submit. You will receive a unique ticket reference number immediately.',
  },
  {
    category: 'Tickets',
    q: 'Can I save a ticket and submit it later?',
    a: 'Yes. On the new ticket form, click "Save as Draft" instead of Submit. Your draft will appear in My Tickets with a DRAFT label, and you can complete and submit it any time.',
  },
  {
    category: 'Tickets',
    q: 'How do I track the status of my ticket?',
    a: 'Go to My Tickets and click on any ticket to see its full details, status history, and any replies from staff. You will also receive in-app notifications whenever the status changes.',
  },
  {
    category: 'Tickets',
    q: 'What do the status labels mean?',
    a: 'NEW – received but not yet assigned. ASSIGNED – routed to a department. IN PROGRESS – a staff member is working on it. RESOLVED – the issue has been addressed. CLOSED – the case is complete.',
  },
  {
    category: 'Tickets',
    q: 'Can I reopen a closed ticket?',
    a: 'Yes. Open the ticket detail page and click "Request Reopen". A help desk officer will review your request and reopen the ticket if appropriate.',
  },
  {
    category: 'Tickets',
    q: 'How do I leave feedback after my ticket is resolved?',
    a: 'Once a ticket is marked Resolved, a feedback form appears at the bottom of the ticket detail page. Rate the service from 1 to 5 and leave an optional comment.',
  },
  // Welfare
  {
    category: 'Welfare Cases',
    q: 'What is a welfare case?',
    a: 'Welfare cases are for sensitive personal matters that require confidential handling. They are managed through a separate, restricted workflow that is invisible to ordinary help desk staff and department staff.',
  },
  {
    category: 'Welfare Cases',
    q: 'Who can see my welfare case?',
    a: 'Only you and authorised Welfare Officers can access your welfare case details, messages, and attachments.',
  },
  // Notifications
  {
    category: 'Notifications',
    q: 'How do I manage my notification settings?',
    a: 'Click "Preferences" in the sidebar to open the Notification Preferences page. You can enable or disable each notification type individually.',
  },
  {
    category: 'Notifications',
    q: 'How do I mark notifications as read?',
    a: 'Click the bell icon at the bottom of the sidebar to open your notification list. Use the "Mark all read" button, or click an individual notification to mark just that one.',
  },
  // Account
  {
    category: 'Account',
    q: 'How do I change my password?',
    a: 'Go to My Profile in the sidebar, scroll to the Change Password section, enter your current password and then your new password twice, and click Save.',
  },
  {
    category: 'Account',
    q: 'I forgot my password. What do I do?',
    a: 'On the Login page, click "Forgot Password". Enter your email address, answer your security question, and you will receive a link to create a new password.',
  },
  {
    category: 'Account',
    q: 'Why was I logged out automatically?',
    a: 'For your security, the system logs you out after 15 minutes of inactivity. Simply log in again to continue.',
  },
  // Files
  {
    category: 'Files & Attachments',
    q: 'What file types can I upload?',
    a: 'The system accepts common document and image formats including PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PNG, JPG, and JPEG.',
  },
  {
    category: 'Files & Attachments',
    q: 'Is there a file size limit?',
    a: 'Yes. Each individual file must be 10 MB or smaller.',
  },
]

const categories = Array.from(new Set(faqs.map((f) => f.category)))

const HelpPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('All')

  const filtered =
    activeCategory === 'All' ? faqs : faqs.filter((f) => f.category === activeCategory)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2.5rem 2rem', maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
            Help &amp; FAQ
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Frequently asked questions about using the UniDesk student help desk portal.
          </p>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
          {['All', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setOpenIndex(null) }}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                border: activeCategory === cat
                  ? '2px solid var(--color-primary)'
                  : '2px solid var(--color-border)',
                background: activeCategory === cat ? 'var(--color-primary)' : 'transparent',
                color: activeCategory === cat ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordion FAQ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                style={{
                  background: 'var(--color-surface)',
                  border: `1px solid ${isOpen ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                <button
                  id={`faq-q-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: '1rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.95rem' }}>
                    {item.q}
                  </span>
                  <span
                    style={{
                      fontSize: '1.2rem',
                      color: 'var(--color-primary)',
                      transform: isOpen ? 'rotate(45deg)' : 'none',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div
                    id={`faq-a-${i}`}
                    role="region"
                    aria-labelledby={`faq-q-${i}`}
                    style={{
                      padding: '0 1.25rem 1rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.65,
                      fontSize: '0.9rem',
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Contact box */}
        <div
          style={{
            marginTop: '2.5rem',
            padding: '1.5rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.75rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.4rem' }}>
            Still need help?
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Submit a ticket through the{' '}
            <a href="/student/tickets/new" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Submit Ticket
            </a>{' '}
            page and a help desk officer will assist you.
          </p>
        </div>
      </main>
    </div>
  )
}

export default HelpPage
