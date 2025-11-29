-- Table for Certificate Exams
CREATE TABLE CertificateExams (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    passing_score INTEGER NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- User ID of the examiner
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT FALSE
);

-- Table for Questions in Certificate Exams
CREATE TABLE CertificateQuestions (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    exam_id VARCHAR(36) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'MCQ', 'CODING', etc.
    options TEXT, -- JSON string for MCQ options
    correct_answer TEXT,
    points INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES CertificateExams(id) ON DELETE CASCADE
);

-- Table for User Certificates (Generated upon passing)
CREATE TABLE UserCertificates (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    user_id VARCHAR(255) NOT NULL,
    exam_id VARCHAR(36) NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    certificate_url TEXT, -- URL to the generated PDF
    score INTEGER NOT NULL,
    FOREIGN KEY (exam_id) REFERENCES CertificateExams(id) ON DELETE CASCADE
);
