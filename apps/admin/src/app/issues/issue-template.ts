export interface IssueTemplateField {
  id: string;
  type: "textarea" | "dropdown";
  label: string;
  description?: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

export interface IssueTemplate {
  slug: string;
  name: string;
  description: string;
  labels: string[];
  fields: IssueTemplateField[];
}

export function buildIssueBody(
  fields: IssueTemplateField[],
  values: Record<string, string>,
): string {
  const sanitize = (value: string | undefined) => {
    const trimmed = (value || "").trim();
    return trimmed ? trimmed : "_No response_";
  };

  return fields
    .map((field) => `### ${field.label}\n\n${sanitize(values[field.id])}`)
    .join("\n\n");
}
