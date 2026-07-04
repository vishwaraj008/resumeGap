CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_users_email (email)
);

CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_text_or_file_path TEXT,
    extracted_skills JSON,
    extraction_breakdown JSON,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_resumes_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS match_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT NOT NULL,
    target_role VARCHAR(255) NOT NULL,
    match_percent FLOAT NOT NULL,
    missing_skills JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    INDEX idx_match_results_resume_id (resume_id),
    INDEX idx_match_results_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS roadmaps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_result_id INT NOT NULL,
    skill VARCHAR(255) NOT NULL,
    course_recommendations JSON,
    estimated_duration VARCHAR(50),
    sequence_order INT,
    FOREIGN KEY (match_result_id) REFERENCES match_results(id) ON DELETE CASCADE,
    INDEX idx_roadmaps_match_result_id (match_result_id)
);