import type { AssignmentStatus } from './types';

export interface SummaryStudent {
  studentCode: string;
  fullName: string;
  email: string | null;
  lastSubmittedAt: string;
  submittedAssignments: number;
  totalAssignments: number;
  missingAssignments: number;
  overdueAssignments: number;
  completionRate: number | null;
}
interface SummaryScope {
  classroom: { _id: string; code: string; name: string; archived: boolean };
  semester: { _id: string; name: string; academicYear: string } | null;
  courseSections: {
    _id: string;
    code: string;
    name: string;
    archived: boolean;
  }[];
  totalAssignments: number;
  scheduledAssignments: number;
  includeArchived: boolean;
  generatedAt: string;
  coverageNotice: string;
}
export interface SubmissionSummary extends SummaryScope {
  items: SummaryStudent[];
  total: number;
  page: number;
  limit: number;
  overview: {
    observedStudents: number;
    completedStudents: number;
    incompleteStudents: number;
    submittedAssignments: number;
  };
}
export interface SummaryAssignment {
  id: string;
  title: string;
  courseSectionId: string;
  courseSectionCode: string;
  opensAt: string;
  dueAt: string;
  archived: boolean;
  status: AssignmentStatus;
  overdue: boolean;
  submission: {
    id: string;
    version: number;
    submittedAt: string;
    late: boolean;
  } | null;
}
export interface StudentSubmissionSummary extends SummaryScope {
  student: SummaryStudent;
  assignments: SummaryAssignment[];
}
