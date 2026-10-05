-- ============================================================
-- UniDesk — SQL Server Schema
-- Run this entire script against an empty "UniDesk" database
-- ============================================================

USE master;
GO

IF EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = N'UniDesk')
BEGIN
    -- Force drop by setting single user mode to disconnect active connections
    ALTER DATABASE UniDesk SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE UniDesk;
END
GO

CREATE DATABASE UniDesk;
GO

USE UniDesk;
GO

-- Map the existing 'unidesk' login to this new database and grant owner rights
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'unidesk')
BEGIN
    CREATE USER unidesk FOR LOGIN unidesk;
    ALTER ROLE db_owner ADD MEMBER unidesk;
END
GO

-- ─────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────
CREATE TABLE departments (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500),
    active      BIT NOT NULL DEFAULT 1,
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ─────────────────────────────────────────
-- 2. CATEGORIES
-- ─────────────────────────────────────────
CREATE TABLE categories (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL UNIQUE,
    description   NVARCHAR(500),
    department_id BIGINT REFERENCES departments(id),
    active        BIT NOT NULL DEFAULT 1,
    created_at    DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ─────────────────────────────────────────
-- 3. USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    full_name       NVARCHAR(150)  NOT NULL,
    email           NVARCHAR(255)  NOT NULL UNIQUE,
    password_hash   NVARCHAR(255)  NOT NULL,
    role            NVARCHAR(30)   NOT NULL CHECK (role IN ('STUDENT','HELP_DESK_OFFICER','DEPARTMENT_STAFF','WELFARE_OFFICER','ADMIN','MANAGEMENT')),
    department_id   BIGINT         REFERENCES departments(id),   -- for DEPARTMENT_STAFF
    phone           NVARCHAR(20),
    student_id      NVARCHAR(50),   -- for STUDENT
    security_question    NVARCHAR(300),  -- for password reset via security question
    security_answer_hash NVARCHAR(255),  -- BCrypt hash of the answer
    active          BIT NOT NULL DEFAULT 1,
    -- Self-registered students must verify their email before logging in;
    -- admin-provisioned accounts are created already verified.
    email_verified  BIT NOT NULL DEFAULT 0,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_users_role  ON users(role);
GO

-- ─────────────────────────────────────────
-- 3b. VALID STUDENT IDS (pre-provisioned roster gating self-registration)
-- ─────────────────────────────────────────
CREATE TABLE valid_student_ids (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    student_id          NVARCHAR(50) NOT NULL UNIQUE,
    is_registered       BIT NOT NULL DEFAULT 0,
    registered_user_id  BIGINT NULL REFERENCES users(id),
    created_at          DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ─────────────────────────────────────────
-- 3c. EMAIL VERIFICATION TOKENS
-- ─────────────────────────────────────────
CREATE TABLE email_verification_tokens (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       NVARCHAR(255) NOT NULL UNIQUE,
    expires_at  DATETIME2 NOT NULL,
    used        BIT NOT NULL DEFAULT 0,
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ─────────────────────────────────────────
-- 4. PASSWORD RESET TOKENS
-- ─────────────────────────────────────────
CREATE TABLE password_reset_tokens (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       NVARCHAR(255) NOT NULL UNIQUE,
    expires_at  DATETIME2 NOT NULL,
    used        BIT NOT NULL DEFAULT 0,
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ─────────────────────────────────────────
-- 5. TICKETS
-- ─────────────────────────────────────────
CREATE TABLE tickets (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    reference_no    NVARCHAR(20) NOT NULL UNIQUE,   -- e.g. TKT-2026-0001
    student_id      BIGINT NOT NULL REFERENCES users(id),
    category_id     BIGINT NOT NULL REFERENCES categories(id),
    department_id   BIGINT REFERENCES departments(id),   -- set when assigned
    assigned_to     BIGINT REFERENCES users(id),          -- dept staff user
    subject         NVARCHAR(300) NOT NULL,
    description     NVARCHAR(MAX) NOT NULL,
    status          NVARCHAR(20) NOT NULL DEFAULT 'NEW'
                        CHECK (status IN ('NEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED')),
    priority        NVARCHAR(10) NOT NULL DEFAULT 'NORMAL'
                        CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
    is_draft        BIT NOT NULL DEFAULT 0,
    feedback_rating INT,
    feedback_comment NVARCHAR(1000),
    due_date        DATETIME2,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    resolved_at     DATETIME2,
    -- Structured resolution summary — distinct from the comment thread.
    resolution_note     NVARCHAR(MAX),
    resolution_note_by  BIGINT REFERENCES users(id),
    resolution_note_at  DATETIME2,
    -- Last time the overdue reminder was sent; set via a bulk update that
    -- bypasses updated_at so it never resets ticket staleness tracking.
    overdue_notified_at DATETIME2
);
GO

CREATE INDEX IX_tickets_student    ON tickets(student_id);
CREATE INDEX IX_tickets_dept       ON tickets(department_id);
CREATE INDEX IX_tickets_status     ON tickets(status);
CREATE INDEX IX_tickets_priority   ON tickets(priority);
CREATE INDEX IX_tickets_ref        ON tickets(reference_no);
GO

-- ─────────────────────────────────────────
-- 6. TICKET COMMENTS
-- ─────────────────────────────────────────
CREATE TABLE ticket_comments (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id   BIGINT NOT NULL REFERENCES users(id),
    body        NVARCHAR(MAX) NOT NULL,
    is_internal BIT NOT NULL DEFAULT 0,   -- internal = only visible to staff
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at  DATETIME2 NULL   -- NULL = never edited since creation
);
GO

CREATE INDEX IX_ticket_comments_ticket ON ticket_comments(ticket_id);
GO

-- Help Desk / Admin triage notes — independent of ticket_comments (department reply thread).
CREATE TABLE ticket_triage_notes (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id   BIGINT NOT NULL REFERENCES users(id),
    note        NVARCHAR(MAX) NOT NULL,
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_ticket_triage_notes_ticket ON ticket_triage_notes(ticket_id);
GO

-- Help Desk ticket tags (Module 2) — e.g. "Duplicate", "Needs info".
CREATE TABLE ticket_tags (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    label       NVARCHAR(40) NOT NULL,
    added_by    BIGINT NOT NULL REFERENCES users(id),
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_ticket_tags_ticket_label UNIQUE (ticket_id, label)
);
GO

CREATE INDEX IX_ticket_tags_ticket ON ticket_tags(ticket_id);
GO

-- Department saved reply templates (Module 3).
CREATE TABLE department_reply_templates (
    id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    department_id  BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    title          NVARCHAR(100) NOT NULL,
    body           NVARCHAR(MAX) NOT NULL,
    created_by     BIGINT NOT NULL REFERENCES users(id),
    created_at     DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_reply_templates_department ON department_reply_templates(department_id);
GO

-- ─────────────────────────────────────────
-- 7. TICKET ATTACHMENTS
-- ─────────────────────────────────────────
CREATE TABLE ticket_attachments (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id       BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    uploaded_by     BIGINT NOT NULL REFERENCES users(id),
    original_name   NVARCHAR(255) NOT NULL,
    stored_name     NVARCHAR(255) NOT NULL,
    file_size       BIGINT NOT NULL,
    content_type    NVARCHAR(100),
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ─────────────────────────────────────────
-- 8. TICKET STATUS HISTORY
-- ─────────────────────────────────────────
CREATE TABLE ticket_status_history (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by  BIGINT NOT NULL REFERENCES users(id),
    old_status  NVARCHAR(20),
    new_status  NVARCHAR(20) NOT NULL,
    note        NVARCHAR(500),
    changed_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_ticket_status_hist ON ticket_status_history(ticket_id);
GO

-- ─────────────────────────────────────────
-- 9. WELFARE CASES  (completely separate from tickets)
-- ─────────────────────────────────────────
CREATE TABLE welfare_cases (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    reference_no    NVARCHAR(20) NOT NULL UNIQUE,   -- e.g. WEL-000001
    student_id      BIGINT NOT NULL REFERENCES users(id),
    assigned_to     BIGINT REFERENCES users(id),          -- welfare officer
    subject         NVARCHAR(300) NOT NULL,
    description     NVARCHAR(MAX) NOT NULL,
    status          NVARCHAR(20) NOT NULL DEFAULT 'NEW'
                        CHECK (status IN ('NEW','IN_PROGRESS','RESOLVED','CLOSED')),
    is_urgent       BIT NOT NULL DEFAULT 0,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    resolved_at     DATETIME2
);
GO

CREATE INDEX IX_welfare_student  ON welfare_cases(student_id);
CREATE INDEX IX_welfare_officer  ON welfare_cases(assigned_to);
CREATE INDEX IX_welfare_status   ON welfare_cases(status);
GO

-- ─────────────────────────────────────────
-- 10. WELFARE COMMENTS (private channel)
-- ─────────────────────────────────────────
CREATE TABLE welfare_comments (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    case_id     BIGINT NOT NULL REFERENCES welfare_cases(id) ON DELETE CASCADE,
    author_id   BIGINT NOT NULL REFERENCES users(id),
    body        NVARCHAR(MAX) NOT NULL,
    is_internal BIT NOT NULL DEFAULT 0,   -- internal = confidential note, never visible to the student
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_welfare_comments_case ON welfare_comments(case_id);
GO

-- ─────────────────────────────────────────
-- 11. WELFARE STATUS HISTORY
-- ─────────────────────────────────────────
CREATE TABLE welfare_status_history (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    case_id     BIGINT NOT NULL REFERENCES welfare_cases(id) ON DELETE CASCADE,
    changed_by  BIGINT NOT NULL REFERENCES users(id),
    old_status  NVARCHAR(20),
    new_status  NVARCHAR(20) NOT NULL,
    note        NVARCHAR(500),
    changed_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_welfare_status_hist ON welfare_status_history(case_id);
GO

-- 12. WELFARE ATTACHMENTS
CREATE TABLE welfare_attachments (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    case_id       BIGINT NOT NULL REFERENCES welfare_cases(id) ON DELETE CASCADE,
    uploaded_by   BIGINT NOT NULL REFERENCES users(id),
    file_name     NVARCHAR(255) NOT NULL,
    stored_name   NVARCHAR(255) NOT NULL,
    content_type  NVARCHAR(100) NOT NULL,
    file_size     BIGINT NOT NULL,
    uploaded_at   DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX IX_welfare_attachments_case ON welfare_attachments(case_id);
GO

-- ─────────────────────────────────────────
-- 12. NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE notifications (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       NVARCHAR(200) NOT NULL,
    message     NVARCHAR(500) NOT NULL,
    link        NVARCHAR(300),   -- frontend route, e.g. /tickets/42
    is_read     BIT NOT NULL DEFAULT 0,
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_notifications_user ON notifications(user_id, is_read);
GO

-- ─────────────────────────────────────────
-- 13. AUDIT LOG
-- ─────────────────────────────────────────
CREATE TABLE audit_log (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    actor_id    BIGINT REFERENCES users(id),   -- NULL for system actions
    actor_email NVARCHAR(255),
    action      NVARCHAR(100) NOT NULL,        -- e.g. USER_LOGIN, TICKET_STATUS_CHANGED
    entity_type NVARCHAR(50),                  -- TICKET, WELFARE_CASE, USER
    entity_id   BIGINT,
    detail      NVARCHAR(1000),                -- JSON or plain text description
    ip_address  NVARCHAR(45),
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_audit_actor   ON audit_log(actor_id);
CREATE INDEX IX_audit_action  ON audit_log(action);
CREATE INDEX IX_audit_created ON audit_log(created_at DESC);
GO

-- ─────────────────────────────────────────
-- 14. ANNOUNCEMENTS
-- ─────────────────────────────────────────
CREATE TABLE announcements (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    title           NVARCHAR(200) NOT NULL,
    body            NVARCHAR(MAX) NOT NULL,
    created_by      BIGINT NOT NULL REFERENCES users(id),
    is_published    BIT NOT NULL DEFAULT 0,
    start_date      DATETIME2,
    end_date        DATETIME2,
    -- NULL = visible to every role; otherwise an exact Role enum name (e.g. 'STUDENT')
    target_role     NVARCHAR(30),
    priority        NVARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_announcements_published ON announcements(is_published);
GO

-- ─────────────────────────────────────────
-- 15. NOTIFICATION PREFERENCES
-- ─────────────────────────────────────────
CREATE TABLE notification_preferences (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type   NVARCHAR(50) NOT NULL,
    enabled             BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_notif_pref UNIQUE (user_id, notification_type)
);
GO

CREATE INDEX IX_notif_pref_user ON notification_preferences(user_id);
GO

-- ─────────────────────────────────────────
-- 16. STUDENT PROFILES
-- Extended academic & personal info for STUDENT role users
-- ─────────────────────────────────────────
CREATE TABLE student_profiles (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    -- Personal details
    nic_number          NVARCHAR(20),
    date_of_birth       DATE,
    gender              NVARCHAR(10),
    address             NVARCHAR(500),
    city                NVARCHAR(100),
    guardian_name       NVARCHAR(150),
    guardian_phone      NVARCHAR(20),
    guardian_relationship NVARCHAR(50),
    -- Academic details
    degree_programme    NVARCHAR(150),
    faculty             NVARCHAR(150),
    specialisation      NVARCHAR(150),
    intake_year         INT,
    intake_month        NVARCHAR(20),
    current_semester    INT,
    academic_year       NVARCHAR(20),
    cgpa                DECIMAL(3,2),
    -- Status
    scholarship_status  NVARCHAR(50),
    hostel_resident     BIT NOT NULL DEFAULT 0,
    medical_notes       NVARCHAR(500),
    created_at          DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at          DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_student_profile_user ON student_profiles(user_id);
GO

-- ─────────────────────────────────────────
-- 17. STUDENT SEMESTER FEES
-- ─────────────────────────────────────────
CREATE TABLE student_semester_fees (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    academic_year   NVARCHAR(20) NOT NULL,
    semester        INT NOT NULL,
    total_fee       DECIMAL(12,2) NOT NULL,
    paid_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    due_date        DATE,
    paid_date       DATE,
    status          NVARCHAR(20) NOT NULL DEFAULT 'UNPAID'
                        CHECK (status IN ('PAID','PARTIAL','UNPAID','OVERDUE','WAIVED')),
    remarks         NVARCHAR(300),
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_fees_user ON student_semester_fees(user_id);
GO

-- ─────────────────────────────────────────
-- 18. STUDENT EXAM RECORDS
-- ─────────────────────────────────────────
CREATE TABLE student_exams (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    academic_year   NVARCHAR(20) NOT NULL,
    semester        INT NOT NULL,
    module_code     NVARCHAR(20) NOT NULL,
    module_name     NVARCHAR(200) NOT NULL,
    credits         INT,
    grade           NVARCHAR(5),
    grade_points    DECIMAL(3,2),
    result          NVARCHAR(10) CHECK (result IN ('PASS','FAIL','ABSENT','REPEAT','PENDING')),
    exam_date       DATE,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE INDEX IX_exams_user ON student_exams(user_id);
GO
