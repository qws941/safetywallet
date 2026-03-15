import {
  EducationContentType,
  QuestionType,
  QuizStatus,
  StatutoryTrainingType,
  TbmTopicCategory,
  TrainingCompletionStatus,
} from "../enums";

// === Education Content ===

export interface CreateEducationContentDto {
  siteId: string;
  title: string;
  description?: string;
  contentType: EducationContentType;
  contentUrl?: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
  externalSource?: "LOCAL" | "YOUTUBE" | "KOSHA";
  externalId?: string;
  sourceUrl?: string;
}

export interface EducationContentDto {
  id: string;
  siteId: string;
  title: string;
  description: string | null;
  contentType: EducationContentType;
  contentUrl: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  durationMinutes: number | null;
  externalSource: "LOCAL" | "YOUTUBE" | "KOSHA";
  externalId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EducationContentListDto {
  id: string;
  title: string;
  contentType: EducationContentType;
  isActive: boolean;
  quizCount: number;
  viewCount: number;
  completionCount: number;
  createdAt: string;
}

export interface UpdateEducationContentDto {
  title?: string;
  description?: string;
  contentType?: EducationContentType;
  contentUrl?: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
  externalSource?: "LOCAL" | "YOUTUBE" | "KOSHA";
  externalId?: string;
  sourceUrl?: string;
}

// === Quiz ===

export interface CreateQuizDto {
  siteId: string;
  contentId?: string;
  title: string;
  description?: string;
  status?: QuizStatus;
  pointsReward?: number;
  timeLimitMinutes?: number;
}

export interface UpdateQuizDto {
  title?: string;
  description?: string;
  status?: QuizStatus;
  pointsReward?: number;
  timeLimitMinutes?: number;
  contentId?: string;
}
export interface QuizDto {
  id: string;
  siteId: string;
  contentId: string | null;
  title: string;
  description: string | null;
  status: QuizStatus;
  passScore: number;
  pointsReward: number;
  timeLimitSec: number | null;
  questions: QuizQuestionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestionDto {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface QuizListDto {
  id: string;
  title: string;
  status: QuizStatus;
  passScore: number;
  pointsReward: number;
  questionCount: number;
  attemptCount: number;
  createdAt: string;
}

// === Quiz Attempt ===

export interface SubmitQuizAttemptDto {
  quizId: string;
  siteId: string;
  answers: (number | number[] | string)[];
  startedAt: string;
}

export interface QuizAttemptDto {
  id: string;
  quizId: string;
  userId: string;
  siteId: string;
  score: number;
  passed: boolean;
  answers: (number | number[] | string)[];
  startedAt: string;
  completedAt: string;
  quizTitle?: string;
  userName?: string;
}

export interface QuizAttemptFilterDto {
  siteId: string;
  quizId?: string;
  userId?: string;
  passed?: boolean;
  page?: number;
  limit?: number;
}

// === Statutory Training ===

export interface CreateStatutoryTrainingDto {
  siteId: string;
  userId: string;
  trainingType: StatutoryTrainingType;
  trainingName: string;
  trainingDate: string;
  expirationDate?: string;
  provider?: string;
  certificateUrl?: string;
  hoursCompleted?: number;
  status?: TrainingCompletionStatus;
  notes?: string;
}

export interface UpdateStatutoryTrainingDto {
  trainingType?: StatutoryTrainingType;
  trainingName?: string;
  trainingDate?: string;
  expirationDate?: string;
  provider?: string;
  certificateUrl?: string;
  hoursCompleted?: number;
  status?: TrainingCompletionStatus;
  notes?: string;
}

export interface StatutoryTrainingDto {
  id: string;
  siteId: string;
  userId: string;
  trainingType: StatutoryTrainingType;
  trainingName: string;
  trainingHours: number;
  scheduledDate: string;
  completedDate: string | null;
  expiryDate: string | null;
  status: TrainingCompletionStatus;
  certificateUrl: string | null;
  provider: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  creatorName?: string;
}

export interface StatutoryTrainingFilterDto {
  siteId: string;
  trainingType?: StatutoryTrainingType;
  status?: TrainingCompletionStatus;
  userId?: string;
  page?: number;
  limit?: number;
}

// === TBM Record ===

export interface CreateTbmRecordDto {
  siteId: string;
  date: string;
  topic: string;
  content?: string;
  topicCategory?: TbmTopicCategory;
  leaderId?: string;
  weatherCondition?: string;
  specialNotes?: string;
}

export interface UpdateTbmRecordDto {
  date?: string;
  topic?: string;
  topicCategory?: TbmTopicCategory;
  content?: string;
  weatherCondition?: string;
  specialNotes?: string;
}

export interface TbmRecordDto {
  id: string;
  siteId: string;
  leaderId: string;
  date: string;
  topic: string;
  content: string | null;
  weatherCondition: string | null;
  specialNotes: string | null;
  attendeeCount: number;
  topicCategory: TbmTopicCategory | null;
  attendees: TbmAttendeeDto[];
  leaderName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TbmAttendeeDto {
  id: string;
  userId: string;
  userName?: string;
  signedAt: string;
}

export interface TbmRecordListDto {
  id: string;
  date: string;
  topic: string;
  leaderName: string | null;
  topicCategory: TbmTopicCategory | null;
  attendeeCount: number;
  createdAt: string;
}

export interface TbmRecordFilterDto {
  siteId: string;
  fromDate?: string;
  toDate?: string;
  leaderId?: string;
  topicCategory?: TbmTopicCategory;
  page?: number;
  limit?: number;
}

// Education AI Analysis
export interface EducationAiAnalysisResult {
  category:
    | "safety_training"
    | "equipment_operation"
    | "emergency_response"
    | "hazard_awareness"
    | "ppe_usage"
    | "regulatory_compliance"
    | "health_wellness"
    | "general_safety";
  qualityLevel:
    | "excellent"
    | "good"
    | "adequate"
    | "needs_improvement"
    | "poor";
  summary: string;
  keyLearningPoints: string[];
  safetyRelevance: string;
  relatedStatutoryTraining: string[];
  improvements: string[];
  targetAudience: string;
  confidence: number;
  modelVersion: string;
}

export interface EducationAiAnalysisDto {
  analysis: EducationAiAnalysisResult | null;
  analyzedAt: string | null;
}

export interface TbmAiAnalysisResult {
  riskLevel: "high" | "medium" | "low";
  summary: string;
  identifiedRisks: string[];
  safetyChecklist: string[];
  precautions: string[];
  relatedRegulations: string[];
  confidence: number;
  modelVersion: string;
}

export interface TbmAiAnalysisDto {
  analysis: TbmAiAnalysisResult | null;
  analyzedAt: string | null;
}

export interface TbmMeetingMinutesResult {
  title: string;
  date: string;
  location: string;
  leader: string;
  attendeeCount: number;
  weatherCondition: string;
  agenda: string[];
  discussionPoints: string[];
  safetyInstructions: string[];
  riskAssessment: {
    level: string;
    keyRisks: string[];
  };
  actionItems: string[];
  conclusion: string;
  modelVersion: string;
}

export interface TbmMeetingMinutesDto {
  minutes: TbmMeetingMinutesResult | null;
  generatedAt: string | null;
}

export interface QuizGenerationQuestionDto {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  questionType: "SINGLE_CHOICE" | "OX";
}

export interface QuizGenerationDto {
  quizTitle: string;
  questions: QuizGenerationQuestionDto[];
}

export interface AnnouncementDraftDto {
  title: string;
  content: string;
}
