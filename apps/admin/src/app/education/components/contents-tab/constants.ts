import type { ContentFormState } from "../education-types";

export const INITIAL_CONTENT_FORM: ContentFormState = {
  title: "",
  contentType: "VIDEO",
  description: "",
  contentUrl: "",
  thumbnailUrl: "",
  durationMinutes: "",
  externalSource: "LOCAL",
  externalId: "",
  sourceUrl: "",
};
