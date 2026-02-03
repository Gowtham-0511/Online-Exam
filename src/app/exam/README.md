# Exam Interface & Proctoring Engine

The Exam Page is the most critical and complex part of the Sysrank platform. It provides a secure, high-fidelity environment for candidates to perform coding and SQL challenges under rigorous monitoring.

## 🚀 Key Features

- **Multi-Mode Editor**: Integrated Monaco Editor with support for Python and SQL (including schema visualization).
- **Proctoring Engine**: A multi-layered security system that detects and logs:
  - Tab switching and browser window blurring.
  - Fullscreen exit attempts.
  - Restricted keyboard shortcuts (Copy, Paste, PrintScreen).
  - Mouse activity (Right-click, leaving the window).
  - Idle periods and connectivity changes.
- **AI-Assisted Execution**: Capability to "Run with AI" to help candidates debug logic while maintaining exam integrity limits.
- **Progress Persistence**: Automatic local storage backup and server-side syncing to prevent data loss during crashes or network drops.
- **ER Diagram**: Interactive schema viewer for SQL questions to help candidates visualize complex database structures.

## 🛠 Technical Architecture

- **Dynamic Imports**: Components like `ProctoringMonitor` and `ERDiagramModal` are loaded dynamically to keep initial bundle size manageable.
- **Event Listeners**: Extensive globally-scoped event listeners for `visibilitychange`, `blur`, `keydown`, and `contextmenu`.
- **Wake Lock API**: Uses `navigator.wakeLock` to prevent the device from sleeping during long assessments.
- **Ref-Based Management**: Heavy use of `useRef` for tracking proctoring state without triggering unnecessary re-renders in the massive file.

## 📂 Logic Flow

1. **Initialization**: Fetches exam configuration, validates candidate eligibility, and requests Wake Lock.
2. **Monitoring**: `ProctoringMonitor` starts background threads for focus tracking and fullscreen enforcement.
3. **Execution**: Handles code runs via specialized API endpoints (Python/SQL executors).
4. **Validation**: Every violation triggers a log entry and potential AI-powered verification.
5. **Submission**: Performs a final "Cleanup" (stopping recording, clearing local state) before finalizing the attempt.

## 🤝 Collaborator Notes

- **File Size**: `page.tsx` is exceptionally large due to the high density of proctoring logic; consider breaking out utility functions into `@/lib/exam-utils.ts`.
- **Violation Logic**: To modify how warnings are displayed, look for `handleViolationExplanationSubmit`.
- **Code Execution**: Handlers for code runs are grouped under `// Code execution handlers`.
- **Testing**: When testing proctoring features, ensure you are in a production-like environment as some browser extensions can interfere with Focus/Blur events.
