import type {
  Category,
  HazardSubcategory,
  RiskLevel,
  Visibility,
  ReviewStatus,
  ActionStatus,
} from "../enums";

export interface CreatePostDto {
  siteId: string;
  category: Category;
  hazardType?: string;
  riskLevel?: RiskLevel;
  hazardSubcategory?: HazardSubcategory;
  locationFloor?: string;
  locationZone?: string;
  locationDetail?: string;
  content: string;
  visibility?: Visibility;
  isAnonymous?: boolean;
  imageUrls?: string[];
  imageHashes?: (string | null)[];
  metadata?: Record<string, unknown>;
}

export interface PostDto {
  id: string;
  userId: string;
  siteId: string;
  category: Category;
  hazardType: string | null;
  hazardSubcategory: HazardSubcategory | null;
  riskLevel: RiskLevel | null;
  locationFloor: string | null;
  locationZone: string | null;
  locationDetail: string | null;
  content: string;
  visibility: Visibility;
  isAnonymous: boolean;
  reviewStatus: ReviewStatus;
  actionStatus: ActionStatus;
  isUrgent: boolean;
  createdAt: string;
  updatedAt: string;
  images: PostImageDto[];
  author?: {
    id: string;
    nameMasked: string | null;
  };
}

export interface PostImageDto {
  id: string;
  fileUrl: string;
  mediaType: string;
  thumbnailUrl: string | null;
  aiAnalysis?: AiAnalysisDto | null;
}

export interface AiAnalysisDto {
  id: string;
  hazardType: string;
  severity: string;
  description: string;
  recommendations: string[];
  detectedObjects: string[];
  confidence: number;
  relatedRegulations: string[];
  modelVersion: string;
  analyzedAt: string;
}

export interface PostListDto {
  id: string;
  category: Category;
  content: string;
  reviewStatus: ReviewStatus;
  actionStatus: ActionStatus;
  isUrgent: boolean;
  createdAt: string;
  imageCount: number;
  author?: {
    nameMasked: string | null;
  };
}

export interface PostFilterDto {
  siteId: string;
  category?: Category;
  reviewStatus?: ReviewStatus;
  actionStatus?: ActionStatus;
  isUrgent?: boolean;
  hazardSubcategory?: HazardSubcategory;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ActionImageAiAnalysisResult {
  complianceStatus:
    | "compliant"
    | "non_compliant"
    | "partial"
    | "not_applicable";
  ppeDetected: string[];
  ppeMissing: string[];
  safetyObservations: string[];
  improvementAreas: string[];
  beforeAfterComparison: string | null;
  overallAssessment: string;
  confidence: number;
  modelVersion: string;
}

export interface ActionImageAiAnalysisDto {
  aiAnalysis: ActionImageAiAnalysisResult | null;
  aiAnalyzedAt: string | null;
}

export interface BeforeAfterComparisonResult {
  overallImprovement:
    | "SIGNIFICANT"
    | "MODERATE"
    | "MINIMAL"
    | "NONE"
    | "WORSENED";
  improvementScore: number;
  beforeCondition: string;
  afterCondition: string;
  changesIdentified: string[];
  remainingIssues: string[];
  complianceImprovement: boolean;
  safetyRating: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  recommendation: string;
  confidence: number;
  modelVersion: string;
}

export interface BeforeAfterComparisonDto {
  comparison: BeforeAfterComparisonResult | null;
  comparedAt: string | null;
}

export interface PostClassificationResult {
  suggestedCategory: string;
  suggestedHazardType: string | null;
  suggestedRiskLevel: string;
  suggestedHazardSubcategory: string | null;
  classificationReason: string;
  keyFindings: string[];
  confidence: number;
  modelVersion: string;
}

export interface PostClassificationDto {
  aiClassification: PostClassificationResult | null;
  aiClassifiedAt: string | null;
}
