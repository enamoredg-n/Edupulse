export type AiResultLike = {
  duplicateCount?: number;
  rawJson?: {
    qualityChecks?: Record<string, unknown>;
    geminiReasoning?: {
      ultraConcerningIssues?: Array<Record<string, unknown>>;
    };
  };
  themes: Array<{
    title: string;
  }>;
};

export function quality(result: AiResultLike) {
  return result.rawJson?.qualityChecks ?? {};
}

export function hasTitle(titles: string[], fragment: string) {
  return titles.some((title) => title.includes(fragment.toLowerCase()));
}

export function urgentTitles(result: AiResultLike) {
  return (
    result.rawJson?.geminiReasoning?.ultraConcerningIssues ?? []
  ).map((item) => String(item.title ?? '').toLowerCase());
}

export function themeTitles(result: AiResultLike) {
  return result.themes.map((theme) => theme.title.toLowerCase());
}

export function rejectedCount(result: AiResultLike) {
  return Number(quality(result).lowQualityRejectedCount ?? 0);
}

export function duplicateCount(result: AiResultLike) {
  return Number(quality(result).duplicateCount ?? result.duplicateCount ?? 0);
}
