# Organizer Dashboard

The Organizer Dashboard is the administrative control center of Sysrank. It allows examiners to create, manage, and analyze assessments while tracking candidate progress in real-time.

## 🚀 Key Features

- **Assessment Management**: Full CRUD operations for Python and SQL assessments.
- **Real-time Analytics**: High-level metrics for active assessments, total candidates, and evaluation completion rates.
- **Candidate Tracking**: Detailed view of all submissions, including status, scores, and evaluation progress.
- **Exam Builder**: A sophisticated interface (`create-exam/`) for designing multifaceted assessments.
- **Analytics Engine**: Deep-dive analytics (`ExamAnalytics/`) for comparing candidate performance and identifying trends.

## 🛠 Technical Architecture

- **State Management**: Uses React state for tab management and filtering.
- **API Integration**: Connects to `/api/organizer/*` endpoints for assessment and submission data.
- **UI System**:
  - **StatCard**: Modular component for displaying KPIs with percentage trends.
  - **Tabs**: Organizes assessments into Active, Drafts, and Archived states.
  - **GSAP**: Staggered animations for a professional, dashboard-first feel.

## 📂 Directory Structure

- `page.tsx`: The main overview dashboard.
- `create-exam/`: Multi-step form for assessment creation.
- `organizer-submissions/`: Detailed listing and filtering of candidate attempts.
- `view-exams/`: Individual assessment management and editing.
- `ExamAnalytics/`: Data visualization and performance reporting.
- `schedule/`: Assessment scheduling and invitation management.

## 🤝 Collaborator Notes

- **Permission Model**: Most API calls are scope-restricted by the examiner's email (stored in the MSAL session).
- **Extensibility**: When adding new assessment types, ensure they are reflected in the language badge logic in the main table.
- **Data Refreshing**: Uses SWR for automatic revalidation when the tab regains focus or the network reconnects.
