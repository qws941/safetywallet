import { createLogger } from "./logger";

const logger = createLogger("gemini-ai");

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TEXT_MODEL = "openrouter/free";
const DEFAULT_MULTIMODAL_MODEL = "openrouter/free";

interface OpenRouterTextPart {
  type: "text";
  text: string;
}

interface OpenRouterImagePart {
  type: "image_url";
  image_url: {
    url: string;
  };
}

interface OpenRouterFilePart {
  type: "file";
  file: {
    filename: string;
    file_data: string;
  };
}

type OpenRouterContentPart =
  | OpenRouterTextPart
  | OpenRouterImagePart
  | OpenRouterFilePart;

interface OpenRouterApiResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
}

export interface AiCredentials {
  apiKey: string;
  textModel?: string;
  multimodalModel?: string;
  siteUrl?: string;
  appName?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

function buildTextPart(text: string): OpenRouterTextPart {
  return { type: "text", text };
}

function buildImagePart(mimeType: string, base64: string): OpenRouterImagePart {
  return {
    type: "image_url",
    image_url: {
      url: toDataUrl(mimeType, base64),
    },
  };
}

function buildFilePart(
  filename: string,
  mimeType: string,
  base64: string,
): OpenRouterFilePart {
  return {
    type: "file",
    file: {
      filename,
      file_data: toDataUrl(mimeType, base64),
    },
  };
}

function extractTextContent(
  content:
    | string
    | Array<{
        type?: string;
        text?: string;
      }>
    | undefined,
): string | null {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const text = content
    .map((part) => (typeof part?.text === "string" ? part.text : null))
    .filter((part): part is string => Boolean(part))
    .join("\n")
    .trim();

  return text.length > 0 ? text : null;
}

function normalizeJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  return trimmed;
}

function injectSchemaReference(
  content: OpenRouterContentPart[],
  responseSchema: Record<string, unknown>,
): OpenRouterContentPart[] {
  const schemaText = `\n\nJSON schema reference:\n${JSON.stringify(responseSchema)}`;
  const firstTextIndex = content.findIndex((part) => part.type === "text");

  if (firstTextIndex === -1) {
    return [
      buildTextPart(
        `Return valid JSON matching this schema exactly.\n${JSON.stringify(responseSchema)}`,
      ),
      ...content,
    ];
  }

  return content.map((part, index) =>
    index === firstTextIndex && part.type === "text"
      ? { ...part, text: `${part.text}${schemaText}` }
      : part,
  );
}

export function getAiCredentials(env: {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL_TEXT?: string;
  OPENROUTER_MODEL_MULTIMODAL?: string;
  OPENROUTER_SITE_URL?: string;
  OPENROUTER_APP_NAME?: string;
}): AiCredentials | null {
  if (!env.OPENROUTER_API_KEY) {
    return null;
  }

  return {
    apiKey: env.OPENROUTER_API_KEY,
    textModel: env.OPENROUTER_MODEL_TEXT,
    multimodalModel: env.OPENROUTER_MODEL_MULTIMODAL,
    siteUrl: env.OPENROUTER_SITE_URL,
    appName: env.OPENROUTER_APP_NAME,
  };
}

async function callOpenRouterJson<T>(
  credentials: AiCredentials,
  options: {
    content: OpenRouterContentPart[];
    responseSchema: Record<string, unknown>;
    multimodal?: boolean;
  },
): Promise<{ parsed: T; modelVersion: string } | null> {
  const content = injectSchemaReference(
    options.content,
    options.responseSchema,
  );
  const usesFiles = content.some((part) => part.type === "file");
  const needsMultimodal =
    options.multimodal || content.some((part) => part.type !== "text");
  const requestedModel = needsMultimodal
    ? (credentials.multimodalModel ?? DEFAULT_MULTIMODAL_MODEL)
    : (credentials.textModel ?? DEFAULT_TEXT_MODEL);

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
      ...(credentials.siteUrl ? { "HTTP-Referer": credentials.siteUrl } : {}),
      ...(credentials.appName
        ? { "X-OpenRouter-Title": credentials.appName }
        : {}),
    },
    body: JSON.stringify({
      model: requestedModel,
      messages: [
        {
          role: "user",
          content,
        },
      ],
      ...(usesFiles
        ? {
            plugins: [
              {
                id: "file-parser",
                pdf: {
                  engine: "pdf-text",
                },
              },
            ],
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    logger.error("OpenRouter AI call failed", {
      error: {
        name: "OpenRouterApiError",
        message: `OpenRouter API returned status ${response.status}: ${details}`,
      },
    });
    return null;
  }

  const payload = (await response.json()) as OpenRouterApiResponse;
  const text = extractTextContent(payload.choices?.[0]?.message?.content);

  if (!text) {
    return null;
  }

  const parsed = JSON.parse(normalizeJsonText(text)) as T;

  return {
    parsed,
    modelVersion:
      typeof payload.model === "string" ? payload.model : requestedModel,
  };
}

const HAZARD_TYPES = [
  "fall_hazard",
  "electrical",
  "chemical",
  "fire",
  "confined_space",
  "ppe_violation",
  "structural",
  "machinery",
  "general",
  "ergonomic",
  "environmental",
  "vehicle",
  "noise",
  "biological",
] as const;

const SEVERITY_LEVELS = ["low", "medium", "high", "critical"] as const;

export interface GeminiAnalysisResult {
  hazardType: string;
  severity: string;
  description: string;
  recommendations: string[];
  detectedObjects: string[];
  confidence: number;
  relatedRegulations: string[];
  modelVersion: string;
}

const POST_CATEGORIES = [
  "HAZARD",
  "UNSAFE_BEHAVIOR",
  "INCONVENIENCE",
  "SUGGESTION",
  "BEST_PRACTICE",
] as const;

const POST_RISK_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
const POST_HAZARD_SUBCATEGORIES = [
  "FALL",
  "COLLAPSE",
  "STRUCK_BY",
  "CAUGHT_IN",
  "ELECTROCUTION",
  "FIRE",
  "CHEMICAL",
  "OTHER",
] as const;

export interface PostClassificationResult {
  suggestedCategory: string;
  suggestedHazardType: string | null;
  suggestedHazardSubcategory: string | null;
  suggestedRiskLevel: string;
  classificationReason: string;
  keyFindings: string[];
  confidence: number;
  modelVersion: string;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isValidHazardType(value: unknown): value is string {
  return (
    typeof value === "string" &&
    HAZARD_TYPES.includes(value as (typeof HAZARD_TYPES)[number])
  );
}

function isValidSeverity(value: unknown): value is string {
  return (
    typeof value === "string" &&
    SEVERITY_LEVELS.includes(value as (typeof SEVERITY_LEVELS)[number])
  );
}

function isValidAnalysisResultShape(
  value: unknown,
): value is Omit<GeminiAnalysisResult, "modelVersion"> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isValidHazardType(candidate.hazardType) &&
    isValidSeverity(candidate.severity) &&
    typeof candidate.description === "string" &&
    isStringArray(candidate.recommendations) &&
    isStringArray(candidate.detectedObjects) &&
    typeof candidate.confidence === "number" &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1 &&
    isStringArray(candidate.relatedRegulations)
  );
}

export async function analyzeHazardImage(
  credentials: AiCredentials,
  imageData: ArrayBuffer,
  mimeType: string,
): Promise<GeminiAnalysisResult | null> {
  try {
    if (!mimeType || imageData.byteLength === 0) {
      return null;
    }

    const base64 = arrayBufferToBase64(imageData);

    const prompt = `당신은 산업안전보건 관리자입니다. 작업 현장 이미지를 분석해 위험요소를 식별하고 한국 산업안전보건법 관점에서 개선 조치를 제안하세요.

You are an occupational safety manager. Analyze the workplace image and return strict JSON only.

Requirements:
1) hazardType: choose exactly one from [fall_hazard, electrical, chemical, fire, confined_space, ppe_violation, structural, machinery, general, ergonomic, environmental, vehicle, noise, biological].
2) severity: choose one of [low, medium, high, critical].
3) description: Korean description of the hazard with context.
4) recommendations: specific Korean corrective actions.
5) detectedObjects: objects/conditions detected in the image.
6) confidence: number between 0 and 1.
7) relatedRegulations: Korean OSHA references (산업안전보건법 및 관련 시행령/고시/안전보건규칙).

Output must be valid JSON and match the schema exactly.`;

    const result = await callOpenRouterJson<
      Omit<GeminiAnalysisResult, "modelVersion">
    >(credentials, {
      content: [buildTextPart(prompt), buildImagePart(mimeType, base64)],
      responseSchema: {
        type: "OBJECT",
        properties: {
          hazardType: {
            type: "STRING",
            enum: [...HAZARD_TYPES],
          },
          severity: {
            type: "STRING",
            enum: [...SEVERITY_LEVELS],
          },
          description: {
            type: "STRING",
          },
          recommendations: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          detectedObjects: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          confidence: {
            type: "NUMBER",
          },
          relatedRegulations: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: [
          "hazardType",
          "severity",
          "description",
          "recommendations",
          "detectedObjects",
          "confidence",
          "relatedRegulations",
        ],
      },
      multimodal: true,
    });

    if (!result || !isValidAnalysisResultShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI hazard analysis failed", {
      error: {
        name: "AiHazardAnalysisError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

function isValidPostClassificationShape(
  value: unknown,
): value is Omit<PostClassificationResult, "modelVersion"> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const category = candidate.suggestedCategory;
  const hazardType = candidate.suggestedHazardType;
  const hazardSubcategory = candidate.suggestedHazardSubcategory;

  if (
    typeof category !== "string" ||
    !POST_CATEGORIES.includes(category as (typeof POST_CATEGORIES)[number])
  ) {
    return false;
  }

  if (category === "HAZARD") {
    if (typeof hazardType !== "string" || hazardType.length === 0) {
      return false;
    }
    if (
      typeof hazardSubcategory !== "string" ||
      !POST_HAZARD_SUBCATEGORIES.includes(
        hazardSubcategory as (typeof POST_HAZARD_SUBCATEGORIES)[number],
      )
    ) {
      return false;
    }
  } else if (hazardType !== null) {
    return false;
  } else if (hazardSubcategory !== null && hazardSubcategory !== undefined) {
    return false;
  }

  return (
    typeof candidate.suggestedRiskLevel === "string" &&
    POST_RISK_LEVELS.includes(
      candidate.suggestedRiskLevel as (typeof POST_RISK_LEVELS)[number],
    ) &&
    typeof candidate.classificationReason === "string" &&
    isStringArray(candidate.keyFindings) &&
    typeof candidate.confidence === "number" &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1
  );
}

const POST_CLASSIFICATION_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    suggestedCategory: {
      type: "STRING" as const,
      enum: [...POST_CATEGORIES],
    },
    suggestedHazardType: {
      type: "STRING" as const,
      nullable: true,
    },
    suggestedHazardSubcategory: {
      type: "STRING" as const,
      enum: [...POST_HAZARD_SUBCATEGORIES],
      nullable: true,
    },
    suggestedRiskLevel: {
      type: "STRING" as const,
      enum: [...POST_RISK_LEVELS],
    },
    classificationReason: {
      type: "STRING" as const,
    },
    keyFindings: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    confidence: {
      type: "NUMBER" as const,
    },
  },
  required: [
    "suggestedCategory",
    "suggestedHazardType",
    "suggestedHazardSubcategory",
    "suggestedRiskLevel",
    "classificationReason",
    "keyFindings",
    "confidence",
  ],
};

export async function classifyPost(
  credentials: AiCredentials,
  content: string,
  imageData?: ArrayBuffer,
  mimeType?: string,
): Promise<PostClassificationResult | null> {
  try {
    if (!content || content.trim().length === 0) {
      return null;
    }

    const prompt = `당신은 건설 현장 산업안전보건 관리자입니다. 제보 텍스트(및 선택적 이미지)를 분석해 분류를 추천하세요.

You are an occupational safety manager for construction sites. Analyze the report content and optional image, and return strict JSON only.

Requirements:
1) suggestedCategory: choose exactly one from [HAZARD, UNSAFE_BEHAVIOR, INCONVENIENCE, SUGGESTION, BEST_PRACTICE].
2) suggestedHazardType: Korean/English hazard type label only when category is HAZARD, otherwise null.
3) suggestedHazardSubcategory: choose one of [FALL, COLLAPSE, STRUCK_BY, CAUGHT_IN, ELECTROCUTION, FIRE, CHEMICAL, OTHER] only when category is HAZARD, otherwise null.
4) suggestedRiskLevel: choose one of [HIGH, MEDIUM, LOW].
5) classificationReason: Korean explanation of why this category/risk was selected (1-3 sentences).
6) keyFindings: Korean bullet-style findings (2-5 items).
7) confidence: number between 0 and 1.

Output must be valid JSON and match the schema exactly.`;

    const parts: OpenRouterContentPart[] = [
      buildTextPart(`${prompt}\n\n제보 내용:\n${content}`),
    ];

    if (imageData && imageData.byteLength > 0) {
      parts.push(
        buildImagePart(
          mimeType || "image/jpeg",
          arrayBufferToBase64(imageData),
        ),
      );
    }

    const result = await callOpenRouterJson<
      Omit<PostClassificationResult, "modelVersion">
    >(credentials, {
      content: parts,
      responseSchema: POST_CLASSIFICATION_RESPONSE_SCHEMA,
      multimodal: parts.some((part) => part.type !== "text"),
    });

    if (!result || !isValidPostClassificationShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      suggestedHazardSubcategory:
        result.parsed.suggestedHazardSubcategory ?? null,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI post classification failed", {
      error: {
        name: "AiPostClassificationError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

// === Education Content AI Analysis ===

const EDUCATION_QUALITY_LEVELS = [
  "excellent",
  "good",
  "adequate",
  "needs_improvement",
  "poor",
] as const;

const EDUCATION_CATEGORIES = [
  "safety_training",
  "equipment_operation",
  "emergency_response",
  "hazard_awareness",
  "ppe_usage",
  "regulatory_compliance",
  "health_wellness",
  "general_safety",
] as const;

export interface EducationAnalysisResult {
  category: string;
  qualityLevel: string;
  summary: string;
  keyLearningPoints: string[];
  safetyRelevance: string;
  relatedStatutoryTraining: string[];
  improvements: string[];
  targetAudience: string;
  confidence: number;
  modelVersion: string;
}

function isValidEducationAnalysisShape(
  value: unknown,
): value is Omit<EducationAnalysisResult, "modelVersion"> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const c = value as Record<string, unknown>;

  return (
    typeof c.category === "string" &&
    EDUCATION_CATEGORIES.includes(
      c.category as (typeof EDUCATION_CATEGORIES)[number],
    ) &&
    typeof c.qualityLevel === "string" &&
    EDUCATION_QUALITY_LEVELS.includes(
      c.qualityLevel as (typeof EDUCATION_QUALITY_LEVELS)[number],
    ) &&
    typeof c.summary === "string" &&
    isStringArray(c.keyLearningPoints) &&
    typeof c.safetyRelevance === "string" &&
    isStringArray(c.relatedStatutoryTraining) &&
    isStringArray(c.improvements) &&
    typeof c.targetAudience === "string" &&
    typeof c.confidence === "number" &&
    c.confidence >= 0 &&
    c.confidence <= 1
  );
}

function buildEducationPrompt(contentType: string): string {
  const base = `당신은 산업안전보건 교육 전문가입니다. 교육 콘텐츠를 분석하여 품질과 안전교육 적합성을 평가하세요.

You are an occupational safety education specialist. Analyze the education content and return strict JSON only.

Requirements:
1) category: choose exactly one from [safety_training, equipment_operation, emergency_response, hazard_awareness, ppe_usage, regulatory_compliance, health_wellness, general_safety].
2) qualityLevel: choose one of [excellent, good, adequate, needs_improvement, poor].
3) summary: Korean summary of the education content (2-3 sentences).
4) keyLearningPoints: key learning objectives in Korean (3-5 items).
5) safetyRelevance: Korean explanation of how this content relates to workplace safety.
6) relatedStatutoryTraining: related Korean statutory training requirements (산업안전보건법 관련 법정교육).
7) improvements: Korean suggestions for improving the content.
8) targetAudience: Korean description of the target audience.
9) confidence: number between 0 and 1.

Output must be valid JSON and match the schema exactly.`;

  if (contentType === "IMAGE") {
    return `${base}

Analyze the attached safety education image material.`;
  }
  if (contentType === "DOCUMENT") {
    return `${base}

Analyze the attached safety education document.`;
  }
  return `${base}

Analyze the following safety education text content.`;
}

const EDUCATION_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    category: {
      type: "STRING" as const,
      enum: [...EDUCATION_CATEGORIES],
    },
    qualityLevel: {
      type: "STRING" as const,
      enum: [...EDUCATION_QUALITY_LEVELS],
    },
    summary: { type: "STRING" as const },
    keyLearningPoints: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    safetyRelevance: { type: "STRING" as const },
    relatedStatutoryTraining: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    improvements: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    targetAudience: { type: "STRING" as const },
    confidence: { type: "NUMBER" as const },
  },
  required: [
    "category",
    "qualityLevel",
    "summary",
    "keyLearningPoints",
    "safetyRelevance",
    "relatedStatutoryTraining",
    "improvements",
    "targetAudience",
    "confidence",
  ],
};

export async function analyzeEducationContent(
  credentials: AiCredentials,
  contentType: "IMAGE" | "TEXT" | "DOCUMENT",
  options: {
    imageData?: ArrayBuffer;
    mimeType?: string;
    textContent?: string;
    title?: string;
  },
): Promise<EducationAnalysisResult | null> {
  try {
    const prompt = buildEducationPrompt(contentType);
    const parts: OpenRouterContentPart[] = [];

    if (options.title) {
      parts.push(buildTextPart(`교육 콘텐츠 제목: ${options.title}`));
    }
    parts.push(buildTextPart(prompt));

    if (
      (contentType === "IMAGE" || contentType === "DOCUMENT") &&
      options.imageData &&
      options.mimeType
    ) {
      if (options.imageData.byteLength === 0) {
        return null;
      }
      const base64 = arrayBufferToBase64(options.imageData);
      parts.push(
        options.mimeType.startsWith("image/")
          ? buildImagePart(options.mimeType, base64)
          : buildFilePart("education-content.pdf", options.mimeType, base64),
      );
    } else if (contentType === "TEXT") {
      if (!options.textContent) {
        return null;
      }
      parts.push(buildTextPart(`\n\n교육 내용:\n${options.textContent}`));
    } else {
      return null;
    }

    const result = await callOpenRouterJson<
      Omit<EducationAnalysisResult, "modelVersion">
    >(credentials, {
      content: parts,
      responseSchema: EDUCATION_RESPONSE_SCHEMA,
      multimodal: parts.some((part) => part.type !== "text"),
    });

    if (!result || !isValidEducationAnalysisShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI education analysis failed", {
      error: {
        name: "AiEducationAnalysisError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

const TBM_RISK_LEVELS = ["high", "medium", "low"] as const;

export interface TbmAnalysisResult {
  riskLevel: string;
  summary: string;
  identifiedRisks: string[];
  safetyChecklist: string[];
  precautions: string[];
  relatedRegulations: string[];
  confidence: number;
  modelVersion: string;
}

function isValidTbmAnalysisShape(
  value: unknown,
): value is Omit<TbmAnalysisResult, "modelVersion"> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const c = value as Record<string, unknown>;
  return (
    typeof c.riskLevel === "string" &&
    TBM_RISK_LEVELS.includes(c.riskLevel as (typeof TBM_RISK_LEVELS)[number]) &&
    typeof c.summary === "string" &&
    isStringArray(c.identifiedRisks) &&
    isStringArray(c.safetyChecklist) &&
    isStringArray(c.precautions) &&
    isStringArray(c.relatedRegulations) &&
    typeof c.confidence === "number" &&
    c.confidence >= 0 &&
    c.confidence <= 1
  );
}

const TBM_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    riskLevel: {
      type: "STRING" as const,
      enum: [...TBM_RISK_LEVELS],
    },
    summary: { type: "STRING" as const },
    identifiedRisks: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    safetyChecklist: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    precautions: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    relatedRegulations: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    confidence: { type: "NUMBER" as const },
  },
  required: [
    "riskLevel",
    "summary",
    "identifiedRisks",
    "safetyChecklist",
    "precautions",
    "relatedRegulations",
    "confidence",
  ],
};

export async function analyzeTbmRecord(
  credentials: AiCredentials,
  options: {
    topic: string;
    content?: string | null;
    weatherCondition?: string | null;
    specialNotes?: string | null;
  },
): Promise<TbmAnalysisResult | null> {
  try {
    if (!options.topic) {
      return null;
    }

    const prompt = `당신은 산업안전보건 전문가입니다. TBM(Tool Box Meeting) 회의 내용을 분석하여 위험요소를 식별하고 안전 체크리스트를 생성하세요.

You are an occupational safety expert. Analyze the TBM meeting content and return strict JSON only.

Requirements:
1) riskLevel: choose one of [high, medium, low] based on overall risk assessment.
2) summary: Korean summary of the TBM meeting analysis (2-3 sentences).
3) identifiedRisks: identified workplace hazards/risks in Korean (3-7 items).
4) safetyChecklist: safety checklist items workers should verify before starting work in Korean (5-10 items).
5) precautions: specific precautions and safety measures in Korean (3-5 items).
6) relatedRegulations: related Korean OSHA regulations (산업안전보건법 관련 법규/고시/안전보건규칙).
7) confidence: number between 0 and 1.

Output must be valid JSON and match the schema exactly.`;

    const textParts: string[] = [prompt];
    textParts.push(`\n\nTBM 주제: ${options.topic}`);
    if (options.content) {
      textParts.push(`\nTBM 내용: ${options.content}`);
    }
    if (options.weatherCondition) {
      textParts.push(`\n날씨 상태: ${options.weatherCondition}`);
    }
    if (options.specialNotes) {
      textParts.push(`\n특이사항: ${options.specialNotes}`);
    }

    const result = await callOpenRouterJson<
      Omit<TbmAnalysisResult, "modelVersion">
    >(credentials, {
      content: [buildTextPart(textParts.join(""))],
      responseSchema: TBM_RESPONSE_SCHEMA,
    });

    if (!result || !isValidTbmAnalysisShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI TBM analysis failed", {
      error: {
        name: "AiTbmAnalysisError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

const QUIZ_QUESTION_TYPES = ["SINGLE_CHOICE", "OX"] as const;

export interface QuizGenerationResult {
  quizTitle: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    questionType: string;
  }>;
  modelVersion: string;
}

function isValidQuizGenerationShape(
  value: unknown,
): value is Omit<QuizGenerationResult, "modelVersion"> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.quizTitle !== "string" ||
    !Array.isArray(candidate.questions)
  ) {
    return false;
  }

  return candidate.questions.every((question) => {
    if (typeof question !== "object" || question === null) {
      return false;
    }

    const q = question as Record<string, unknown>;
    if (
      typeof q.question !== "string" ||
      !isStringArray(q.options) ||
      typeof q.correctAnswer !== "number" ||
      !Number.isInteger(q.correctAnswer) ||
      typeof q.explanation !== "string" ||
      typeof q.questionType !== "string" ||
      !QUIZ_QUESTION_TYPES.includes(
        q.questionType as (typeof QUIZ_QUESTION_TYPES)[number],
      )
    ) {
      return false;
    }

    const expectedOptionCount = q.questionType === "OX" ? 2 : 4;
    return (
      q.options.length === expectedOptionCount &&
      q.correctAnswer >= 0 &&
      q.correctAnswer < q.options.length
    );
  });
}

const QUIZ_GENERATION_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    quizTitle: { type: "STRING" as const },
    questions: {
      type: "ARRAY" as const,
      items: {
        type: "OBJECT" as const,
        properties: {
          question: { type: "STRING" as const },
          options: {
            type: "ARRAY" as const,
            items: { type: "STRING" as const },
          },
          correctAnswer: { type: "INTEGER" as const },
          explanation: { type: "STRING" as const },
          questionType: {
            type: "STRING" as const,
            enum: [...QUIZ_QUESTION_TYPES],
          },
        },
        required: [
          "question",
          "options",
          "correctAnswer",
          "explanation",
          "questionType",
        ],
      },
    },
  },
  required: ["quizTitle", "questions"],
};

export async function generateQuizFromContent(
  credentials: AiCredentials,
  options: {
    contentTitle: string;
    contentAnalysis: string;
  },
): Promise<QuizGenerationResult | null> {
  try {
    if (!options.contentTitle || !options.contentAnalysis) {
      return null;
    }

    const prompt = `당신은 산업안전보건 교육 퀴즈 전문가입니다. 교육 콘텐츠 분석 결과를 바탕으로 학습 효과를 측정할 수 있는 퀴즈를 생성하세요.

Generate 5 quiz questions based on the education content analysis.
Requirements:
1) quizTitle: Korean quiz title derived from content
2) questions: array of 5 questions
   - question: Korean question text
   - options: 4 Korean answer choices (for SINGLE_CHOICE) or 2 choices ["O (맞다)", "X (틀리다)"] (for OX)
   - correctAnswer: 0-based index of correct option
   - explanation: Korean explanation of why the answer is correct
   - questionType: "SINGLE_CHOICE" or "OX"
3) Mix question types: at least 3 SINGLE_CHOICE and up to 2 OX questions

Output must be valid JSON and match the schema exactly.`;

    const result = await callOpenRouterJson<
      Omit<QuizGenerationResult, "modelVersion">
    >(credentials, {
      content: [
        buildTextPart(
          `${prompt}\n\n교육 콘텐츠 제목: ${options.contentTitle}\n\n교육 콘텐츠 분석 결과(JSON):\n${options.contentAnalysis}`,
        ),
      ],
      responseSchema: QUIZ_GENERATION_RESPONSE_SCHEMA,
    });

    if (!result || !isValidQuizGenerationShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI quiz generation failed", {
      error: {
        name: "AiQuizGenerationError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

export interface ActionImageAnalysisResult {
  complianceStatus: string;
  ppeDetected: string[];
  ppeMissing: string[];
  safetyObservations: string[];
  improvementAreas: string[];
  beforeAfterComparison: string | null;
  overallAssessment: string;
  confidence: number;
  modelVersion: string;
}

const OVERALL_IMPROVEMENTS = [
  "SIGNIFICANT",
  "MODERATE",
  "MINIMAL",
  "NONE",
  "WORSENED",
] as const;

const SAFETY_RATINGS = ["EXCELLENT", "GOOD", "FAIR", "POOR"] as const;

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

function isValidBeforeAfterComparisonShape(
  value: unknown,
): value is Omit<BeforeAfterComparisonResult, "modelVersion"> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const v = value as Record<string, unknown>;
  return (
    typeof v.overallImprovement === "string" &&
    OVERALL_IMPROVEMENTS.includes(
      v.overallImprovement as (typeof OVERALL_IMPROVEMENTS)[number],
    ) &&
    typeof v.improvementScore === "number" &&
    v.improvementScore >= 0 &&
    v.improvementScore <= 100 &&
    typeof v.beforeCondition === "string" &&
    typeof v.afterCondition === "string" &&
    isStringArray(v.changesIdentified) &&
    isStringArray(v.remainingIssues) &&
    typeof v.complianceImprovement === "boolean" &&
    typeof v.safetyRating === "string" &&
    SAFETY_RATINGS.includes(
      v.safetyRating as (typeof SAFETY_RATINGS)[number],
    ) &&
    typeof v.recommendation === "string" &&
    typeof v.confidence === "number" &&
    v.confidence >= 0 &&
    v.confidence <= 100
  );
}

const BEFORE_AFTER_COMPARISON_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    overallImprovement: {
      type: "STRING" as const,
      enum: [...OVERALL_IMPROVEMENTS],
    },
    improvementScore: { type: "INTEGER" as const },
    beforeCondition: { type: "STRING" as const },
    afterCondition: { type: "STRING" as const },
    changesIdentified: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    remainingIssues: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    complianceImprovement: { type: "BOOLEAN" as const },
    safetyRating: {
      type: "STRING" as const,
      enum: [...SAFETY_RATINGS],
    },
    recommendation: { type: "STRING" as const },
    confidence: { type: "INTEGER" as const },
  },
  required: [
    "overallImprovement",
    "improvementScore",
    "beforeCondition",
    "afterCondition",
    "changesIdentified",
    "remainingIssues",
    "complianceImprovement",
    "safetyRating",
    "recommendation",
    "confidence",
  ],
};

function isValidActionImageAnalysisShape(
  value: unknown,
): value is Omit<ActionImageAnalysisResult, "modelVersion"> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.complianceStatus === "string" &&
    isStringArray(v.ppeDetected) &&
    isStringArray(v.ppeMissing) &&
    isStringArray(v.safetyObservations) &&
    isStringArray(v.improvementAreas) &&
    (v.beforeAfterComparison === null ||
      typeof v.beforeAfterComparison === "string") &&
    typeof v.overallAssessment === "string" &&
    typeof v.confidence === "number" &&
    v.confidence >= 0 &&
    v.confidence <= 100
  );
}

const ACTION_IMAGE_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    complianceStatus: {
      type: "STRING" as const,
      enum: ["compliant", "non_compliant", "partial", "not_applicable"],
    },
    ppeDetected: { type: "ARRAY" as const, items: { type: "STRING" as const } },
    ppeMissing: { type: "ARRAY" as const, items: { type: "STRING" as const } },
    safetyObservations: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    improvementAreas: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    beforeAfterComparison: { type: "STRING" as const, nullable: true },
    overallAssessment: { type: "STRING" as const },
    confidence: { type: "INTEGER" as const },
  },
  required: [
    "complianceStatus",
    "ppeDetected",
    "ppeMissing",
    "safetyObservations",
    "improvementAreas",
    "overallAssessment",
    "confidence",
  ],
};

export async function analyzeActionImage(
  credentials: AiCredentials,
  imageData: string,
  mimeType: string,
): Promise<ActionImageAnalysisResult | null> {
  try {
    if (!mimeType || !imageData) {
      return null;
    }

    const prompt = `당신은 산업안전보건 전문가입니다. 이 조치(시정/개선) 사진을 분석하여 다음을 평가하세요:

1. complianceStatus: 안전 기준 준수 상태 (compliant/non_compliant/partial/not_applicable)
2. ppeDetected: 감지된 개인보호구(PPE) 목록 (예: 안전모, 안전화, 보호장갑 등)
3. ppeMissing: 미착용 또는 누락된 PPE 목록
4. safetyObservations: 안전 관련 관찰 사항 (최대 5개)
5. improvementAreas: 개선이 필요한 영역 (최대 3개)
6. beforeAfterComparison: 개선 전후 비교 설명 (해당되는 경우)
7. overallAssessment: 전반적인 안전 상태 평가 (2-3문장)
8. confidence: 분석 신뢰도 (0-100)

모든 응답은 한국어로 작성하세요.`;

    const result = await callOpenRouterJson<
      Omit<ActionImageAnalysisResult, "modelVersion">
    >(credentials, {
      content: [buildTextPart(prompt), buildImagePart(mimeType, imageData)],
      responseSchema: ACTION_IMAGE_RESPONSE_SCHEMA,
      multimodal: true,
    });

    if (!result || !isValidActionImageAnalysisShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI action image analysis failed", {
      error: {
        name: "AiActionImageAnalysisError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

export async function compareBeforeAfterImages(
  credentials: AiCredentials,
  beforeImageData: string,
  afterImageData: string,
  mimeType: string,
  actionContext?: string,
): Promise<BeforeAfterComparisonResult | null> {
  try {
    if (!beforeImageData || !afterImageData || !mimeType) {
      return null;
    }

    const contextText = actionContext
      ? `\n\n조치 맥락(Action Context): ${actionContext}`
      : "";

    const prompt = `당신은 산업안전보건 전문가입니다. 두 장의 이미지를 비교 분석하세요.

첫 번째 이미지는 BEFORE(개선 전)이고, 두 번째 이미지는 AFTER(개선 후)입니다.
교정/시정 조치의 효과를 평가하고, 안전 수준 개선 여부를 판단해야 합니다.${contextText}

반드시 다음 필드로 JSON만 반환하세요 (영문 필드명 유지):
1) overallImprovement: SIGNIFICANT | MODERATE | MINIMAL | NONE | WORSENED
2) improvementScore: 0-100 정수
3) beforeCondition: 개선 전 상태 설명 (한국어)
4) afterCondition: 개선 후 상태 설명 (한국어)
5) changesIdentified: 전후 비교로 확인된 구체적 변화 목록 (한국어 배열)
6) remainingIssues: 여전히 남아있는 안전 이슈 목록 (한국어 배열, 없으면 빈 배열)
7) complianceImprovement: 법규/안전수칙 준수 수준이 개선되었는지 여부 (boolean)
8) safetyRating: EXCELLENT | GOOD | FAIR | POOR
9) recommendation: 추가 권고사항 (한국어)
10) confidence: 0-100 정수

요구사항:
- BEFORE와 AFTER의 차이를 시각적으로 비교하여 판단하세요.
- 시정조치의 실효성을 객관적으로 평가하세요.
- 모든 텍스트 필드 값은 한국어로 작성하세요.
- 출력은 스키마에 정확히 맞는 유효한 JSON이어야 합니다.

You are comparing BEFORE and AFTER safety images. Return strict JSON only.`;

    const result = await callOpenRouterJson<
      Omit<BeforeAfterComparisonResult, "modelVersion">
    >(credentials, {
      content: [
        buildTextPart(prompt),
        buildImagePart(mimeType, beforeImageData),
        buildImagePart(mimeType, afterImageData),
      ],
      responseSchema: BEFORE_AFTER_COMPARISON_RESPONSE_SCHEMA,
      multimodal: true,
    });

    if (!result || !isValidBeforeAfterComparisonShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI before/after comparison failed", {
      error: {
        name: "AiBeforeAfterComparisonError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

export interface AnnouncementDraftResult {
  title: string;
  content: string;
  modelVersion: string;
}

function isValidAnnouncementDraftShape(
  value: unknown,
): value is Omit<AnnouncementDraftResult, "modelVersion"> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  return typeof v.title === "string" && typeof v.content === "string";
}

const ANNOUNCEMENT_DRAFT_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    title: { type: "STRING" as const },
    content: { type: "STRING" as const },
  },
  required: ["title", "content"],
};

export async function generateAnnouncementDraft(
  credentials: AiCredentials,
  keywords: string,
): Promise<AnnouncementDraftResult | null> {
  try {
    if (!keywords) {
      return null;
    }

    const prompt = `당신은 산업안전보건 공지사항 작성 전문가입니다. 주어진 키워드를 바탕으로 안전 관련 공지사항 초안을 작성하세요.

키워드: ${keywords}

Requirements:
1. title: 간결하고 명확한 공지사항 제목 (한국어)
2. content: HTML 형식의 공지사항 본문 (한국어)
   - <h3> 태그로 섹션 제목
   - <p> 태그로 본문 단락
   - <ul><li> 태그로 목록
   - <strong> 태그로 강조
   - 전문적이고 공식적인 어조
   - 구체적인 안전 지침 포함
   - 관련 법규나 규정 언급 (해당되는 경우)
   - 문의처 안내 포함

공지사항은 현장 근로자가 이해하기 쉽게 작성하세요.`;

    const result = await callOpenRouterJson<
      Omit<AnnouncementDraftResult, "modelVersion">
    >(credentials, {
      content: [buildTextPart(prompt)],
      responseSchema: ANNOUNCEMENT_DRAFT_RESPONSE_SCHEMA,
    });

    if (!result || !isValidAnnouncementDraftShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI announcement draft generation failed", {
      error: {
        name: "AiAnnouncementDraftGenerationError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}

async function callAiJson(
  credentials: AiCredentials,
  prompt: string,
  responseSchema: Record<string, unknown>,
): Promise<{ parsed: unknown; modelVersion: string } | null> {
  return callOpenRouterJson<unknown>(credentials, {
    content: [buildTextPart(prompt)],
    responseSchema,
  });
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

function isValidTbmMeetingMinutesShape(
  value: unknown,
): value is Omit<TbmMeetingMinutesResult, "modelVersion"> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const riskAssessment = candidate.riskAssessment;
  if (typeof riskAssessment !== "object" || riskAssessment === null) {
    return false;
  }

  const risk = riskAssessment as Record<string, unknown>;
  const riskLevel = risk.level;

  return (
    typeof candidate.title === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.location === "string" &&
    typeof candidate.leader === "string" &&
    typeof candidate.attendeeCount === "number" &&
    Number.isInteger(candidate.attendeeCount) &&
    candidate.attendeeCount >= 0 &&
    typeof candidate.weatherCondition === "string" &&
    isStringArray(candidate.agenda) &&
    isStringArray(candidate.discussionPoints) &&
    isStringArray(candidate.safetyInstructions) &&
    typeof riskLevel === "string" &&
    ["high", "medium", "low"].includes(riskLevel) &&
    isStringArray(risk.keyRisks) &&
    isStringArray(candidate.actionItems) &&
    typeof candidate.conclusion === "string"
  );
}

const TBM_MEETING_MINUTES_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    title: { type: "STRING" as const },
    date: { type: "STRING" as const },
    location: { type: "STRING" as const },
    leader: { type: "STRING" as const },
    attendeeCount: { type: "INTEGER" as const },
    weatherCondition: { type: "STRING" as const },
    agenda: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    discussionPoints: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    safetyInstructions: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    riskAssessment: {
      type: "OBJECT" as const,
      properties: {
        level: {
          type: "STRING" as const,
          enum: ["high", "medium", "low"],
        },
        keyRisks: {
          type: "ARRAY" as const,
          items: { type: "STRING" as const },
        },
      },
      required: ["level", "keyRisks"],
    },
    actionItems: {
      type: "ARRAY" as const,
      items: { type: "STRING" as const },
    },
    conclusion: { type: "STRING" as const },
  },
  required: [
    "title",
    "date",
    "location",
    "leader",
    "attendeeCount",
    "weatherCondition",
    "agenda",
    "discussionPoints",
    "safetyInstructions",
    "riskAssessment",
    "actionItems",
    "conclusion",
  ],
};

export async function generateTbmMeetingMinutes(
  credentials: AiCredentials,
  options: {
    topic: string;
    content?: string | null;
    weatherCondition?: string | null;
    specialNotes?: string | null;
    leaderName?: string | null;
    attendeeCount?: number | null;
    date?: string | null;
  },
): Promise<TbmMeetingMinutesResult | null> {
  try {
    if (!options.topic) {
      return null;
    }

    const prompt = `You are a construction site safety meeting minutes generator. Generate structured meeting minutes (회의록) from the TBM (Toolbox Meeting) data provided.

당신은 건설 현장 TBM(Toolbox Meeting) 회의록 생성 전문가입니다. 제공된 TBM 정보를 바탕으로 구조화된 회의록을 작성하세요.

Requirements:
1) title: Meeting title in Korean.
2) date: Formatted date string in Korean style.
3) location: Site/location information.
4) leader: Meeting leader name.
5) attendeeCount: Number of attendees as integer.
6) weatherCondition: Weather at the time of meeting.
7) agenda: Meeting agenda items in Korean (2-6 items).
8) discussionPoints: Key discussion points in Korean (3-8 items).
9) safetyInstructions: Safety instructions provided in Korean (3-8 items).
10) riskAssessment.level: choose one of [high, medium, low].
11) riskAssessment.keyRisks: Key risks identified in Korean (2-6 items).
12) actionItems: Action items in Korean (2-6 items).
13) conclusion: Meeting conclusion summary in Korean (2-3 sentences).

Output must be valid JSON and match the schema exactly.

TBM 주제: ${options.topic}
TBM 내용: ${options.content ?? ""}
날씨 상태: ${options.weatherCondition ?? ""}
특이사항: ${options.specialNotes ?? ""}
인솔자: ${options.leaderName ?? ""}
참석 인원: ${options.attendeeCount ?? 0}
회의 일시: ${options.date ?? ""}`;

    const result = await callAiJson(
      credentials,
      prompt,
      TBM_MEETING_MINUTES_RESPONSE_SCHEMA,
    );

    if (!result || !isValidTbmMeetingMinutesShape(result.parsed)) {
      return null;
    }

    return {
      ...result.parsed,
      modelVersion: result.modelVersion,
    };
  } catch (err) {
    logger.error("AI TBM meeting minutes generation failed", {
      error: {
        name: "AiTbmMeetingMinutesGenerationError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return null;
  }
}
