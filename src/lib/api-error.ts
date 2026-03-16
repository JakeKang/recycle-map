interface ValidationIssue {
  path: PropertyKey[];
  message: string;
}

function normalizeMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (
          item &&
          typeof item === "object" &&
          "message" in item &&
          typeof item.message === "string"
        ) {
          return item.message;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  return null;
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = normalizeMessage(payload.message);
    if (message) {
      return message;
    }
  }

  return fallback;
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return "입력값 검증에 실패했습니다.";
  }

  return issues
    .map((issue) => {
      const field = issue.path.map((segment) => String(segment)).join(".");
      return field ? `${field}: ${issue.message}` : issue.message;
    })
    .join("; ");
}
