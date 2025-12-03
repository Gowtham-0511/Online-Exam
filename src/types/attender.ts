export type Exam = {
  id: React.Key;
  title: string;
  language: string;
  date?: string;
  time?: string;
  duration: string;
  difficulty?: string;
  participants: number;
  startTime: string;
  endTime: string;
  assignmentType?: string;
  isExamProctored?: boolean;
};

export type CompletedExam = {
  id: number;
  examId: string;
  title: string;
  language: string;
  submittedAt: string;
  disqualified: boolean;
  duration: number;
  totalMarksObtained?: number;
  totalPossibleMarks?: number;
  percentage?: number;
};
