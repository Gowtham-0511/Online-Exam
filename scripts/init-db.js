const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

console.log('Initializing database...');

try {
  // Create users table
  // db.exec(`
  //     CREATE TABLE IF NOT EXISTS users (
  //       id INTEGER PRIMARY KEY AUTOINCREMENT,
  //       email TEXT UNIQUE NOT NULL,
  //       name TEXT,
  //       role TEXT DEFAULT 'attender',
  //       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  //       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  //     )
  //   `);

  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS exams (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     title TEXT NOT NULL,
  //     language TEXT NOT NULL,
  //     duration INTEGER NOT NULL,
  //     createdBy TEXT,
  //     createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  //     isExamProctored BOOLEAN DEFAULT 0,
  //     isGeneratedFromExcel BOOLEAN DEFAULT 0,
  //     questionConfig TEXT,
  //     questions TEXT
  //   )
  // `);

  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS questionBank (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     question TEXT,
  //     expectedOutput TEXT,
  //     difficulty TEXT,
  //     marks INTEGER,
  //     language TEXT,
  //     createdBy TEXT,
  //     createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  //   )
  // `);

  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS submissions (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     email TEXT,
  //     userName TEXT,
  //     examId TEXT,
  //     answers TEXT,
  //     answersWithQuestionIds TEXT,
  //     code TEXT,
  //     disqualified BOOLEAN DEFAULT 0,
  //     submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  //   )
  // `);

  // Create indexes
  // db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  // db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');

  // // Exams indexes
  // db.exec('CREATE INDEX IF NOT EXISTS idx_exams_title ON exams(title)');
  // db.exec('CREATE INDEX IF NOT EXISTS idx_exams_createdBy ON exams(createdBy)');
  // db.exec('CREATE INDEX IF NOT EXISTS idx_exams_language ON exams(language)');

  // // Question Bank indexes
  // db.exec('CREATE INDEX IF NOT EXISTS idx_questionBank_createdBy ON questionBank(createdBy)');
  // db.exec('CREATE INDEX IF NOT EXISTS idx_questionBank_language ON questionBank(language)');
  // db.exec('CREATE INDEX IF NOT EXISTS idx_questionBank_difficulty ON questionBank(difficulty)');


  // db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_examId ON submissions(examId);');
  // db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);');
  // db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_exam_user ON submissions(examId, email);');


  // db.exec(`ALTER TABLE exams ADD COLUMN startTime TEXT;`);
  // db.exec(`ALTER TABLE exams ADD COLUMN endTime TEXT;`);
  // db.exec(`ALTER TABLE exams ADD COLUMN allowedUsers TEXT;`);

  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS violation_images (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     email TEXT,
  //     examId TEXT,
  //     reason TEXT,
  //     timestamp TEXT,
  //     imageBase64 TEXT
  //   );
  // `);

  // db.exec(`DROP INDEX IF EXISTS idx_submissions_exam_user;
  // `);

  console.log('Database initialized successfully!');
} catch (error) {
  console.error('Error initializing database:', error);
} finally {
  db.close();
}