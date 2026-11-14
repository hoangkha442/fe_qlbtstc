export interface Entity {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}
export interface Semester extends Entity {
  name: string;
  academicYear: string;
}
export interface Catalog extends Entity {
  code: string;
  name: string;
}
export type Ref<T> = string | T;
export interface Lecturer {
  id?: string;
  _id?: string;
  fullName: string;
  email?: string;
}
export interface CourseSection extends Catalog {
  semesterId: Ref<Semester>;
  subjectId: Ref<Catalog>;
  classId: Ref<Catalog>;
  lecturerId?: Ref<Lecturer>;
}
export interface AssignmentStatus {
  code: 'open' | 'scheduled' | 'expired' | 'closed';
  label: string;
  accepting: boolean;
}
export interface Assignment extends Entity {
  courseSectionId: string;
  title: string;
  instructions: string;
  opensAt: string;
  dueAt: string;
  manuallyClosed: boolean;
  allowLate: boolean;
  allowResubmit: boolean;
  allowedExtensions: string[];
  maxFiles: number;
  maxFileBytes: number;
  status?: AssignmentStatus;
  submissionUrl?: string;
  courseSection?: CourseSection;
  serverTime?: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface SubmissionFile {
  originalName: string;
  bytes: number;
  format: string;
  uploadedAt?: string;
  downloadPath?: string;
}
export interface SubmissionGrade {
  score: number;
  feedback: string;
  gradedAt: string;
  revision: number;
}
export interface GradeSubmissionResult {
  submissionId: string;
  version: number;
  grade: SubmissionGrade;
  emailRequested: boolean;
  emailSent: boolean;
  message: string;
}
export interface Version {
  version: number;
  isLatest: boolean;
  fullName: string;
  email?: string | null;
  note?: string;
  submittedAt: string;
  late: boolean;
  files: SubmissionFile[];
  grade?: SubmissionGrade | null;
}
export interface Receipt extends Version {
  resubmission?: { allowed: boolean; reason: string | null };
  receiptCode: string;
  submissionId: string;
  studentCode: string;
  latestVersion: number;
  assignment: { id: string; title: string };
  courseSection: CourseSection;
  secret?: string;
  reminder?: string;
  identityNotice: string;
  replayed?: boolean;
  versions?: Version[];
  emailSent?: boolean;
  message?: string;
}
export interface Submission extends Entity {
  resubmission?: { allowed: boolean; reason: string | null };
  grade?: SubmissionGrade | null;
  assignmentId: string;
  courseSectionId: string;
  studentCodeNormalized: string;
  fullName: string;
  email?: string | null;
  searchName: string;
  note?: string;
  receiptCode: string;
  latestVersion: number;
  submittedAt: string;
  late: boolean;
  files?: SubmissionFile[];
  versions?: Version[];
}
export interface Dashboard {
  courseSections: number;
  assignments: number;
  submissions: number;
  versions: number;
  lateSubmissions: number;
}
export type Resource = 'semesters' | 'subjects' | 'classes' | 'course-sections';
export type AcademicEntity = Semester | Catalog | CourseSection;
export interface StudentFields {
  studentCode: string;
  fullName: string;
  email: string;
  note?: string;
  secret?: string;
}

export interface TrainingCategory {
  code: 'general' | 'specialized';
  name: string;
  description: string;
  requiresLogin: boolean;
}
export interface StudentProfile {
  id: string;
  lecturerId: string;
  username: string;
  studentCode: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
}
export interface StudentAccount extends Entity {
  username: string;
  studentCode: string;
  fullName: string;
  email: string;
  active: boolean;
  mustChangePassword: boolean;
}
export interface StudentSession {
  accessToken: string;
  student: StudentProfile;
}
export interface IssuedAccount {
  student: StudentAccount;
  emailSent: boolean;
  message: string;
}
export interface SourceAssignment extends Omit<
  Assignment,
  'courseSectionId' | 'courseSection'
> {
  category: 'specialized';
  pathId: string;
  learningPath?: { id: string; title: string };
  moduleId?: string;
  lessonId?: string;
}
export interface LearningResource {
  title: string;
  url: string;
  kind: 'document' | 'source_code' | 'link';
}
export interface LessonOutline extends Entity {
  assignments?: SourceAssignment[];
  pathId: string;
  moduleId: string;
  title: string;
  summary: string;
  durationSeconds: number;
  order: number;
  isPreview: boolean;
  hasVideo?: boolean;
  resourceCount?: number;
  accessible?: boolean;
  completed?: boolean;
  published?: boolean;
}
export interface Lesson extends LessonOutline {
  content: string;
  videoUrl?: string;
  resources: LearningResource[];
  enrolled?: boolean;
}
export interface LearningModule<T = Lesson> extends Entity {
  assignments?: SourceAssignment[];
  pathId: string;
  title: string;
  description: string;
  order: number;
  published: boolean;
  lessons: T[];
}
export interface LearningPath extends Entity {
  assignments?: SourceAssignment[];
  title: string;
  slug: string;
  summary: string;
  description: string;
  objectives: string[];
  prerequisites: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  coverUrl?: string;
  published: boolean;
  enrolled?: boolean;
}
export interface LearningPathDetail extends LearningPath {
  modules: LearningModule[];
}
export interface StudentPathDetail extends LearningPath {
  modules: LearningModule<LessonOutline>[];
  enrolled: boolean;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}
export interface Enrollment extends Entity {
  pathId: string;
  studentId: Pick<
    StudentAccount,
    '_id' | 'username' | 'studentCode' | 'fullName' | 'email' | 'active'
  > | null;
  active: boolean;
}
