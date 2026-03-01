export interface EducationContent {
  id: string;
  siteId: string;
  title: string;
  description: string | null;
  contentType: "VIDEO" | "IMAGE" | "TEXT" | "DOCUMENT";
  contentUrl: string | null;
  thumbnailUrl: string | null;
  durationMinutes: number | null;
  externalSource: "LOCAL" | "YOUTUBE" | "KOSHA";
  externalId: string | null;
  sourceUrl: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface EducationContentsResponse {
  contents: EducationContent[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateEducationContentInput {
  siteId: string;
  title: string;
  contentType: "VIDEO" | "IMAGE" | "TEXT" | "DOCUMENT";
  description?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
  externalSource?: "LOCAL" | "YOUTUBE" | "KOSHA";
  externalId?: string;
  sourceUrl?: string;
}

export type YouTubeOembedResponse = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  authorName: string;
  html?: string;
};

export interface Quiz {
  id: string;
  siteId: string;
  contentId: string | null;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  pointsReward: number;
  passingScore: number;
  timeLimitMinutes: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  questionType: "SINGLE_CHOICE" | "OX" | "MULTI_CHOICE" | "SHORT_ANSWER";
  options: string[];
  correctAnswer: number;
  correctAnswerText: string | null;
  explanation: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

export interface QuizzesResponse {
  quizzes: Quiz[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateQuizInput {
  siteId: string;
  title: string;
  contentId?: string;
  description?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  pointsReward?: number;
  passingScore?: number;
  timeLimitMinutes?: number;
}

export interface CreateQuizQuestionInput {
  question: string;
  options: string[];
  correctAnswer: number;
  questionType?: string;
  correctAnswerText?: string;
  explanation?: string;
  orderIndex?: number;
}

export interface UpdateQuizQuestionInput {
  question?: string;
  options?: string[];
  correctAnswer?: number;
  questionType?: string;
  correctAnswerText?: string;
  explanation?: string;
  orderIndex?: number;
}

export interface StatutoryTraining {
  id: string;
  siteId: string;
  userId: string;
  trainingType: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  trainingName: string;
  trainingDate: string;
  expirationDate: string | null;
  provider: string | null;
  certificateUrl: string | null;
  hoursCompleted: number;
  status: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatutoryTrainingRow {
  training: StatutoryTraining;
  userName: string | null;
}

export interface StatutoryTrainingsResponse {
  trainings: StatutoryTrainingRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateStatutoryTrainingInput {
  siteId: string;
  userId: string;
  trainingType: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  trainingName: string;
  trainingDate: string;
  expirationDate?: string;
  provider?: string;
  certificateUrl?: string;
  hoursCompleted?: number;
  status?: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  notes?: string;
}

export interface UpdateStatutoryTrainingInput {
  trainingType?: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  trainingName?: string;
  trainingDate?: string;
  expirationDate?: string;
  provider?: string;
  certificateUrl?: string;
  hoursCompleted?: number;
  status?: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  notes?: string;
}

export interface TbmRecord {
  id: string;
  siteId: string;
  date: string;
  topic: string;
  content: string | null;
  leaderId: string;
  weatherCondition: string | null;
  specialNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TbmRecordRow {
  tbm: TbmRecord;
  leaderName: string | null;
}

export interface TbmRecordsResponse {
  records: TbmRecordRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface TbmAttendee {
  attendee: {
    id: string;
    tbmRecordId: string;
    userId: string;
    attendedAt: string;
  };
  userName: string | null;
}

export interface TbmRecordDetail extends TbmRecord {
  leaderName: string | null;
  attendees: TbmAttendee[];
  attendeeCount: number;
}

export interface CreateTbmRecordInput {
  siteId: string;
  date: string;
  topic: string;
  content?: string;
  leaderId?: string;
  weatherCondition?: string;
  specialNotes?: string;
}
