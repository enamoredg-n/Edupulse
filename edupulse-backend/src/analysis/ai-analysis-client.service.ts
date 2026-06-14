import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriorityLevel, SentimentLabel } from '@prisma/client';

export type AiFeedbackInput = {
  id: string;
  categoryId: string;
  categoryName: string;
  questionId: string;
  questionText: string;
  rating: number;
  comment: string | null;
  departmentCode: string | null;
  semesterNumber: number | null;
  weight?: number;
};

export type AiGrievanceInput = {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  safetyFlag: boolean;
  isAnonymous: boolean;
  departmentCode: string | null;
};

export type AiAnalysisPayload = {
  term: {
    id: string;
    name: string;
  };
  feedback: AiFeedbackInput[];
  grievances: AiGrievanceInput[];
};

export type AiThemeOutput = {
  categoryId: string | null;
  title: string;
  summary: string;
  sentiment: SentimentLabel;
  priority: PriorityLevel;
  mentionCount: number;
  evidence: Record<string, unknown>;
  actionTitle?: string;
  kpi?: string;
};

export type AiActionOutput = {
  title: string;
  priority: PriorityLevel;
  timeline: string;
  kpi?: string | null;
};

export type AiAnalysisResult = {
  title: string;
  summary: string;
  confidence: number;
  inputCount: number;
  lowSampleFlag: boolean;
  duplicateCount: number;
  rawJson: Record<string, unknown>;
  themes: AiThemeOutput[];
  actions?: AiActionOutput[];
};

@Injectable()
export class AiAnalysisClient {
  private readonly logger = new Logger(AiAnalysisClient.name);

  constructor(private readonly configService: ConfigService) {}

  async analyze(payload: AiAnalysisPayload): Promise<AiAnalysisResult | null> {
    const baseUrl = this.configService.get<string>('AI_SERVICE_URL');

    if (!baseUrl) {
      return null;
    }

    const timeoutMs = Number(
      this.configService.get<string>('AI_SERVICE_TIMEOUT_MS') ?? 15000,
    );

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Connection: 'close' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          this.logger.warn(`AI service returned HTTP ${response.status}`);
          return null;
        }

        const result = (await response.json()) as AiAnalysisResult;
        return this.normalizeResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        if (attempt < 2) {
          this.logger.warn(`AI service request failed (${message}); retrying once`);
          continue;
        }
        this.logger.warn(
          `AI service unavailable, using deterministic fallback: ${message}`,
        );
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }

    return null;
  }

  private normalizeResult(result: AiAnalysisResult): AiAnalysisResult {
    const themes = (result.themes ?? []).map((theme) => ({
      ...theme,
      sentiment: this.resolveSentiment(theme.sentiment),
      priority: this.resolvePriority(theme.priority),
      mentionCount: Math.max(1, Number(theme.mentionCount ?? 1)),
      evidence: theme.evidence ?? {},
    }));

    const actions = (result.actions ?? []).map((action) => ({
      ...action,
      priority: this.resolvePriority(action.priority),
      timeline: action.timeline || '7-14 days',
      kpi: action.kpi ?? null,
    }));

    return {
      title: result.title || 'EduPulse AI feedback intelligence report',
      summary: result.summary || 'AI service generated a feedback report.',
      confidence: Math.max(0, Math.min(1, Number(result.confidence ?? 0.7))),
      inputCount: Math.max(0, Number(result.inputCount ?? 0)),
      lowSampleFlag: Boolean(result.lowSampleFlag),
      duplicateCount: Math.max(0, Number(result.duplicateCount ?? 0)),
      rawJson: result.rawJson ?? {},
      themes,
      actions,
    };
  }

  private resolveSentiment(value: SentimentLabel): SentimentLabel {
    return Object.values(SentimentLabel).includes(value)
      ? value
      : SentimentLabel.NEUTRAL;
  }

  private resolvePriority(value: PriorityLevel): PriorityLevel {
    return Object.values(PriorityLevel).includes(value)
      ? value
      : PriorityLevel.LOW;
  }
}
