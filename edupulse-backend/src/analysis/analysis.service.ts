import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  PriorityLevel,
  SentimentLabel,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AiAnalysisClient,
  type AiAnalysisResult,
  type AiAnalysisPayload,
} from './ai-analysis-client.service';
import { RunAnalysisDto } from './dto/run-analysis.dto';

type CategoryBucket = {
  categoryId: string;
  categoryName: string;
  ratings: number[];
  comments: string[];
};

type FeedbackResponseForAnalysis = Prisma.FeedbackResponseGetPayload<{
  include: {
    category: true;
    question: true;
    submission: {
      include: {
        student: {
          include: { department: true };
        };
      };
    };
  };
}>;

const criticalWords = [
  'ragging',
  'harassment',
  'abuse',
  'unsafe',
  'threat',
  'violence',
  'medical',
];

const negativeWords = [
  'bad',
  'poor',
  'worst',
  'dirty',
  'slow',
  'broken',
  'issue',
  'problem',
  'unfair',
  'not working',
];

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAnalysisClient: AiAnalysisClient,
    private readonly auditService: AuditService,
  ) {}

  async run(adminId: string, collegeId: string, dto: RunAnalysisDto) {
    const term = await this.prisma.academicTerm.findFirst({
      where: { id: dto.termId, collegeId },
    });

    if (!term) {
      throw new NotFoundException('Academic term not found');
    }

    const responses = await this.prisma.feedbackResponse.findMany({
      where: { collegeId, submission: { termId: dto.termId } },
      include: {
        category: true,
        question: true,
        submission: {
          include: {
            student: {
              include: { department: true },
            },
          },
        },
      },
    });

    const aiFeedback = this.buildAiFeedbackPayload(responses);
    const aiResult = await this.aiAnalysisClient.analyze({
      term: {
        id: term.id,
        name: term.name,
      },
      feedback: aiFeedback,
      grievances: [],
    });

    if (aiResult) {
      aiResult.inputCount = responses.length;
      aiResult.lowSampleFlag = responses.length < 20;
      aiResult.rawJson = {
        ...aiResult.rawJson,
        aiPayloadCompaction: {
          originalFeedbackRows: responses.length,
          compactedFeedbackRows: aiFeedback.length,
          method:
            'Duplicate feedback rows are sent to the AI service as weighted representatives for scale-safe analysis.',
        },
        sentimentBreakdown:
          aiResult.rawJson?.sentimentBreakdown ??
          this.buildSentimentBreakdown(responses),
      };
      const report = await this.createReportFromResult(
        collegeId,
        dto.termId,
        aiResult,
      );
      await this.logAnalysisRun(adminId, collegeId, report);
      return report;
    }

    const comments = responses
      .map((response) => response.comment?.trim())
      .filter((comment): comment is string => Boolean(comment));

    const duplicateCount =
      comments.length - new Set(comments.map((c) => c.toLowerCase())).size;
    const lowSampleFlag = responses.length < 20;
    const buckets = new Map<string, CategoryBucket>();

    for (const response of responses) {
      const current = buckets.get(response.categoryId) ?? {
        categoryId: response.categoryId,
        categoryName: response.category.name,
        ratings: [],
        comments: [],
      };

      current.ratings.push(response.rating);

      if (response.comment?.trim()) {
        current.comments.push(response.comment.trim());
      }

      buckets.set(response.categoryId, current);
    }

    const allThemes = [...buckets.values()].map((bucket) =>
      this.buildTheme(bucket),
    );

    const criticalCount = allThemes.filter(
      (theme) => theme.priority === PriorityLevel.CRITICAL,
    ).length;
    const negativeCount = allThemes.filter(
      (theme) =>
        theme.sentiment === SentimentLabel.NEGATIVE ||
        theme.sentiment === SentimentLabel.CRITICAL,
    ).length;
    const confidence = this.calculateConfidence({
      responseCount: responses.length,
      duplicateCount,
      themeCount: allThemes.length,
    });

    const report = await this.prisma.analysisReport.create({
      data: {
        termId: dto.termId,
        collegeId,
        title: `${term.name} feedback intelligence report`,
        summary: this.buildExecutiveSummary({
          responseCount: responses.length,
          themeCount: allThemes.length,
          negativeCount,
          criticalCount,
        }),
        confidence,
        inputCount: responses.length,
        lowSampleFlag,
        duplicateCount,
        rawJson: {
          qualityChecks: {
            totalResponses: responses.length,
            commentCount: comments.length,
            duplicateCount,
            lowSampleFlag,
            method:
              'Deterministic analysis layer; LLM can enrich summaries with the same structured inputs.',
          },
          sentimentBreakdown: this.buildSentimentBreakdown(responses),
        },
        themes: {
          create: allThemes.map((theme) => ({
            categoryId: theme.categoryId,
            collegeId,
            title: theme.title,
            summary: theme.summary,
            sentiment: theme.sentiment,
            priority: theme.priority,
            mentionCount: theme.mentionCount,
            evidence: theme.evidence,
          })),
        },
        actions: {
          create: allThemes
            .filter(
              (theme) =>
                theme.priority === PriorityLevel.HIGH ||
                theme.priority === PriorityLevel.CRITICAL,
            )
            .map((theme) => ({
              title: theme.actionTitle,
              collegeId,
              priority: theme.priority,
              timeline:
                theme.priority === PriorityLevel.CRITICAL
                  ? '24-48 hours'
                  : '7-14 days',
              kpi: theme.kpi,
            })),
        },
      },
      include: {
        themes: { orderBy: [{ priority: 'desc' }, { mentionCount: 'desc' }] },
        actions: { orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] },
      },
    });
    await this.logAnalysisRun(adminId, collegeId, report);
    return report;
  }

  async validationDemo(collegeId: string) {
    const result = await this.aiAnalysisClient.analyze(
      this.buildValidationDemoPayload(collegeId),
    );

    if (!result) {
      return {
        status: 'REVIEW',
        score: 0,
        totalChecks: 1,
        passedChecks: 0,
        summary:
          'AI service is not reachable. Start the Python AI service and run the validation again.',
        cases: [
          {
            name: 'AI service reachable',
            expected: 'FastAPI service responds through AI_SERVICE_URL',
            actual: 'No AI result returned',
            passed: false,
          },
        ],
      };
    }

    const quality = (result.rawJson?.qualityChecks ?? {}) as Record<
      string,
      unknown
    >;
    const reasoning = (result.rawJson?.geminiReasoning ?? {}) as Record<
      string,
      unknown
    >;
    const ultra = Array.isArray(reasoning.ultraConcerningIssues)
      ? (reasoning.ultraConcerningIssues as Array<Record<string, unknown>>)
      : [];
    const ultraTitles = ultra.map((item) =>
      String(item.title ?? '').toLowerCase(),
    );
    const themeTitles = result.themes.map((theme) =>
      theme.title.toLowerCase(),
    );
    const rejectedCount = Number(quality.lowQualityRejectedCount ?? 0);
    const duplicateCount = Number(quality.duplicateCount ?? 0);

    const includesTitle = (titles: string[], fragment: string) =>
      titles.some((title) => title.includes(fragment.toLowerCase()));

    const cases = [
      {
        name: 'Fake comments ignored',
        expected: 'At least 2 fake/out-of-context comments rejected',
        actual: `${rejectedCount} rejected`,
        passed: rejectedCount >= 2,
      },
      {
        name: 'Duplicate comments grouped',
        expected: 'Repeated Wi-Fi comment grouped as one repeated signal',
        actual: `${duplicateCount} duplicate(s) grouped`,
        passed: duplicateCount >= 1,
      },
      {
        name: 'Ragging escalated',
        expected: 'Ragging concern appears only in immediate action layer',
        actual: ultraTitles.join(', ') || 'none',
        passed: includesTitle(ultraTitles, 'ragging'),
      },
      {
        name: 'Harassment escalated',
        expected: 'Harassment concern appears only in immediate action layer',
        actual: ultraTitles.join(', ') || 'none',
        passed: includesTitle(ultraTitles, 'harassment'),
      },
      {
        name: 'Water risk escalated',
        expected: 'Water contamination appears as urgent concern',
        actual: ultraTitles.join(', ') || 'none',
        passed: includesTitle(ultraTitles, 'water contamination'),
      },
      {
        name: 'Normal issues stay in AI findings',
        expected: 'Projector, Wi-Fi, transport and library stay as normal issue cards',
        actual: themeTitles.slice(0, 10).join(', ') || 'none',
        passed:
          includesTitle(themeTitles, 'projector') &&
          includesTitle(themeTitles, 'wi-fi') &&
          includesTitle(themeTitles, 'transport') &&
          includesTitle(themeTitles, 'library'),
      },
      {
        name: 'Faculty issues stay separated',
        expected: 'Attendance and marks partiality become separate faculty issues',
        actual: themeTitles.join(', ') || 'none',
        passed:
          includesTitle(themeTitles, 'attendance') &&
          includesTitle(themeTitles, 'marks partiality'),
      },
    ];

    const passedChecks = cases.filter((item) => item.passed).length;
    const score = Math.round((passedChecks / cases.length) * 100);

    return {
      status: score >= 90 ? 'PASS' : 'REVIEW',
      score,
      totalChecks: cases.length,
      passedChecks,
      summary:
        score >= 90
          ? 'Golden judge demo passed. The same AI pipeline handled quality filtering, duplicate grouping, urgent escalation and normal issue taxonomy.'
          : 'Golden judge demo needs review. Check failed cases before using this flow in front of judges.',
      cases,
      modelMode: result.rawJson?.modelMode ?? 'unknown',
      pipeline: result.rawJson?.pipeline ?? [],
    };
  }

  private buildValidationDemoPayload(collegeId: string): AiAnalysisPayload {
    const rows = [
      {
        category: 'Safety',
        question: 'Do you feel safe on campus?',
        rating: 1,
        comment:
          'Dev Pratap Rai says Gaurav Sharma ECE 4th year ragged him near the hostel stairs.',
        department: 'ECE',
        semester: 1,
      },
      {
        category: 'Safety',
        question: 'Do you feel safe on campus?',
        rating: 1,
        comment:
          'A student reported harassment and physical touch by Raghav sir from CS AI faculty.',
        department: 'CSAI',
        semester: 5,
      },
      {
        category: 'Infrastructure',
        question: 'How safe and usable are campus facilities?',
        rating: 1,
        comment:
          'Water pH level contamination is reported in AB3 building near the CS DS drinking water point.',
        department: 'CSDS',
        semester: 3,
      },
      {
        category: 'Infrastructure',
        question: 'How usable are classrooms?',
        rating: 2,
        comment:
          'AB2 room 307 projector is broken and ECE students are losing class time.',
        department: 'ECE',
        semester: 7,
      },
      {
        category: 'Wi-Fi / Internet',
        question: 'How reliable is internet access?',
        rating: 2,
        comment: 'Wi-Fi is slow in the lab area during project hours.',
        department: 'CSE',
        semester: 5,
      },
      {
        category: 'Wi-Fi / Internet',
        question: 'How reliable is internet access?',
        rating: 2,
        comment: 'Wi-Fi is slow in the lab area during project hours.',
        department: 'CSE',
        semester: 5,
      },
      {
        category: 'Faculty',
        question: 'How regular are classes?',
        rating: 1,
        comment:
          'Faculty is absent from morning lectures and several classes start late.',
        department: 'IT',
        semester: 4,
      },
      {
        category: 'Faculty',
        question: 'How fair is practical marking?',
        rating: 1,
        comment:
          'Practical marks partiality is happening and ECE students are worried about unfair internal marks.',
        department: 'ECE',
        semester: 7,
      },
      {
        category: 'Mess',
        question: 'How is mess hygiene?',
        rating: 1,
        comment:
          'Second year hostel mess has insects near the serving counter and tables are not cleaned.',
        department: 'ME',
        semester: 3,
      },
      {
        category: 'Transport',
        question: 'How reliable is college transport?',
        rating: 2,
        comment:
          'College bus timing is unreliable and the pickup point is overcrowded in the morning.',
        department: 'CE',
        semester: 6,
      },
      {
        category: 'Library',
        question: 'How useful is library access?',
        rating: 2,
        comment:
          'Library seating is not enough during exam weeks and the reading room AC is not working.',
        department: 'CSE',
        semester: 5,
      },
      {
        category: 'Academics',
        question: 'How fair is academic planning?',
        rating: 2,
        comment:
          'Exam schedule has back to back papers and students need a better date sheet gap.',
        department: 'ECE',
        semester: 7,
      },
      {
        category: 'Administration',
        question: 'How helpful is admin office support?',
        rating: 2,
        comment:
          'Scholarship form support is delayed and fee reimbursement documents are not explained clearly.',
        department: 'CSE',
        semester: 5,
      },
      {
        category: 'Academics',
        question: 'How useful is academic support?',
        rating: 2,
        comment: 'ghhvgjhvb ajhdvbs qwerty',
        department: 'CSE',
        semester: 4,
      },
      {
        category: 'Canteen',
        question: 'How is the canteen service?',
        rating: 2,
        comment: 'movie pizza weather phone battery shopping traffic',
        department: 'IT',
        semester: 4,
      },
    ];

    return {
      term: {
        id: `validation-${collegeId}`,
        name: 'Judge AI Validation Demo',
      },
      feedback: rows.map((row, index) => ({
        id: `validation-feedback-${index + 1}`,
        categoryId: `validation-category-${row.category
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`,
        categoryName: row.category,
        questionId: `validation-question-${index + 1}`,
        questionText: row.question,
        rating: row.rating,
        comment: row.comment,
        departmentCode: row.department,
        semesterNumber: row.semester,
      })),
      grievances: [],
    };
  }

  private buildAiFeedbackPayload(
    responses: FeedbackResponseForAnalysis[],
  ): AiAnalysisPayload['feedback'] {
    const compacted = new Map<string, AiAnalysisPayload['feedback'][number]>();

    for (const response of responses) {
      const departmentCode =
        response.submission.student.department?.code ?? null;
      const semesterNumber = response.submission.student.semesterNumber ?? null;
      const comment = response.comment?.trim() ? response.comment.trim() : null;
      const key = [
        response.categoryId,
        response.questionId,
        response.rating,
        this.normalizeAiComment(comment),
        departmentCode ?? '',
        semesterNumber ?? '',
      ].join('::');
      const existing = compacted.get(key);

      if (existing) {
        existing.weight = (existing.weight ?? 1) + 1;
        continue;
      }

      compacted.set(key, {
        id: response.id,
        categoryId: response.categoryId,
        categoryName: response.category.name,
        questionId: response.questionId,
        questionText: response.question.text,
        rating: response.rating,
        comment,
        departmentCode,
        semesterNumber,
        weight: 1,
      });
    }

    return [...compacted.values()];
  }

  private normalizeAiComment(comment: string | null) {
    return (comment ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private async logAnalysisRun(
    adminId: string,
    collegeId: string,
    report: {
      id: string;
      termId: string;
      inputCount: number;
      confidence: number;
      duplicateCount: number;
      lowSampleFlag: boolean;
      themes?: unknown[];
      actions?: unknown[];
    },
  ) {
    await this.auditService.log({
      action: AuditAction.ANALYSIS_RUN,
      actorId: adminId,
      collegeId,
      entity: 'AnalysisReport',
      entityId: report.id,
      metadata: {
        termId: report.termId,
        inputCount: report.inputCount,
        confidence: report.confidence,
        duplicateCount: report.duplicateCount,
        lowSampleFlag: report.lowSampleFlag,
        themeCount: report.themes?.length ?? 0,
        actionCount: report.actions?.length ?? 0,
      },
    });
  }

  private createReportFromResult(
    collegeId: string,
    termId: string,
    result: AiAnalysisResult,
  ) {
    const actions =
      result.actions && result.actions.length > 0
        ? result.actions
        : result.themes
            .filter(
              (theme) =>
                theme.priority === PriorityLevel.HIGH ||
                theme.priority === PriorityLevel.CRITICAL,
            )
            .map((theme) => ({
              title:
                theme.actionTitle ??
                `Resolve ${theme.title.toLowerCase()} with tracked ownership`,
              priority: theme.priority,
              timeline:
                theme.priority === PriorityLevel.CRITICAL
                  ? '24-48 hours'
                  : '7-14 days',
              kpi:
                theme.kpi ??
                `Reduce ${theme.title.toLowerCase()} mentions next cycle`,
            }));

    return this.prisma.analysisReport.create({
      data: {
        termId,
        collegeId,
        title: result.title,
        summary: result.summary,
        confidence: result.confidence,
        inputCount: result.inputCount,
        lowSampleFlag: result.lowSampleFlag,
        duplicateCount: result.duplicateCount,
        generatedBy: 'edupulse-ai-service',
        rawJson: result.rawJson as Prisma.InputJsonValue,
        themes: {
          create: result.themes.map((theme) => ({
            categoryId: theme.categoryId,
            collegeId,
            title: theme.title,
            summary: theme.summary,
            sentiment: theme.sentiment,
            priority: theme.priority,
            mentionCount: theme.mentionCount,
            evidence: theme.evidence as Prisma.InputJsonValue,
          })),
        },
        actions: {
          create: actions.map((action) => ({
            title: action.title,
            collegeId,
            priority: action.priority,
            timeline: action.timeline,
            kpi: action.kpi,
          })),
        },
      },
      include: {
        themes: { orderBy: [{ priority: 'desc' }, { mentionCount: 'desc' }] },
        actions: { orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] },
      },
    });
  }

  private buildTheme(bucket: CategoryBucket) {
    const averageRating =
      bucket.ratings.reduce((sum, rating) => sum + rating, 0) /
      bucket.ratings.length;
    const negativeRatings = bucket.ratings.filter(
      (rating) => rating <= 2,
    ).length;
    const negativeRatio = negativeRatings / bucket.ratings.length;
    const combinedComments = bucket.comments.join(' ').toLowerCase();
    const hasCriticalLanguage = criticalWords.some((word) =>
      combinedComments.includes(word),
    );
    const negativeWordHits = negativeWords.filter((word) =>
      combinedComments.includes(word),
    ).length;

    const sentiment = this.resolveSentiment({
      averageRating,
      negativeRatio,
      hasCriticalLanguage,
      negativeWordHits,
    });
    const priority = this.resolvePriority({
      sentiment,
      negativeRatio,
      mentionCount: bucket.ratings.length,
      hasCriticalLanguage,
    });

    return {
      categoryId: bucket.categoryId,
      title: `${bucket.categoryName} needs attention`,
      summary: this.buildThemeSummary({
        categoryName: bucket.categoryName,
        averageRating,
        negativeRatings,
        totalRatings: bucket.ratings.length,
        comments: bucket.comments,
      }),
      sentiment,
      priority,
      mentionCount: bucket.ratings.length,
      evidence: {
        averageRating: Number(averageRating.toFixed(2)),
        negativeRatings,
        sampleComments: bucket.comments.slice(0, 3),
        negativeWordHits,
      },
      actionTitle: `Improve ${bucket.categoryName} based on high-impact feedback`,
      kpi: `Raise ${bucket.categoryName} average rating above 3.2 next cycle`,
    };
  }

  private resolveSentiment(input: {
    averageRating: number;
    negativeRatio: number;
    hasCriticalLanguage: boolean;
    negativeWordHits: number;
  }) {
    if (input.hasCriticalLanguage || input.negativeRatio >= 0.65) {
      return SentimentLabel.CRITICAL;
    }

    if (
      input.averageRating < 2.6 ||
      input.negativeRatio >= 0.4 ||
      input.negativeWordHits >= 2
    ) {
      return SentimentLabel.NEGATIVE;
    }

    if (input.averageRating >= 3.3 && input.negativeRatio < 0.25) {
      return SentimentLabel.POSITIVE;
    }

    return SentimentLabel.NEUTRAL;
  }

  private resolvePriority(input: {
    sentiment: SentimentLabel;
    negativeRatio: number;
    mentionCount: number;
    hasCriticalLanguage: boolean;
  }) {
    if (
      input.hasCriticalLanguage ||
      input.sentiment === SentimentLabel.CRITICAL
    ) {
      return PriorityLevel.CRITICAL;
    }

    if (
      input.sentiment === SentimentLabel.NEGATIVE &&
      (input.negativeRatio >= 0.4 || input.mentionCount >= 5)
    ) {
      return PriorityLevel.HIGH;
    }

    if (input.sentiment === SentimentLabel.NEGATIVE) {
      return PriorityLevel.MEDIUM;
    }

    return PriorityLevel.LOW;
  }

  private buildExecutiveSummary(input: {
    responseCount: number;
    themeCount: number;
    negativeCount: number;
    criticalCount: number;
  }) {
    return `Analyzed ${input.responseCount} feedback response(s). Found ${input.themeCount} theme(s), including ${input.negativeCount} negative/critical signal(s) and ${input.criticalCount} critical priority item(s).`;
  }

  private buildThemeSummary(input: {
    categoryName: string;
    averageRating: number;
    negativeRatings: number;
    totalRatings: number;
    comments: string[];
  }) {
    const issueText =
      input.comments.length > 0
        ? `Student comments mention: ${input.comments.slice(0, 2).join(' | ')}`
        : 'No detailed student comments were provided.';

    return `${input.categoryName} average rating is ${input.averageRating.toFixed(2)} from ${input.totalRatings} response(s), with ${input.negativeRatings} low rating(s). ${issueText}`;
  }

  private calculateConfidence(input: {
    responseCount: number;
    duplicateCount: number;
    themeCount: number;
  }) {
    if (input.responseCount === 0) {
      return 0.35;
    }

    const sampleScore = Math.min(input.responseCount / 50, 1) * 0.35;
    const duplicatePenalty =
      input.duplicateCount > 0
        ? Math.min(input.duplicateCount / input.responseCount, 0.25)
        : 0;
    const themeScore = input.themeCount > 0 ? 0.35 : 0.1;
    return Number(
      (0.3 + sampleScore + themeScore - duplicatePenalty).toFixed(2),
    );
  }

  private buildSentimentBreakdown(
    responses: {
      id: string;
      categoryId: string;
      rating: number;
      comment: string | null;
      category: { name: string };
    }[],
  ) {
    const overall = this.emptySentimentCounter();
    const categories = new Map<string, ReturnType<AnalysisService['emptySentimentCounter']>>();

    for (const response of responses) {
      const comment = this.normalizeComment(response.comment ?? '');
      if (!comment || this.isRejectedComment(comment)) {
        continue;
      }

      const categoryName = response.category.name;
      const categoryCounter =
        categories.get(categoryName) ?? this.emptySentimentCounter();
      const label = this.sentimentForPie(response.rating, comment);

      overall[label] += 1;
      categoryCounter[label] += 1;
      categories.set(categoryName, categoryCounter);
    }

    return {
      overall: this.formatSentimentCounter(overall),
      categories: Object.fromEntries(
        [...categories.entries()].map(([category, counter]) => [
          category,
          this.formatSentimentCounter(counter),
        ]),
      ),
    };
  }

  private emptySentimentCounter() {
    return {
      POSITIVE: 0,
      NEUTRAL: 0,
      NEGATIVE: 0,
      CRITICAL: 0,
    };
  }

  private formatSentimentCounter(counter: ReturnType<AnalysisService['emptySentimentCounter']>) {
    const total =
      counter.POSITIVE + counter.NEUTRAL + counter.NEGATIVE + counter.CRITICAL;

    return Object.fromEntries(
      (Object.keys(counter) as Array<keyof typeof counter>).map((label) => [
        label,
        {
          count: counter[label],
          percentage: total > 0 ? Number(((counter[label] / total) * 100).toFixed(1)) : 0,
        },
      ]),
    );
  }

  private sentimentForPie(rating: number, comment: string): SentimentLabel {
    const hasCriticalLanguage = ['ragging', 'harassment', 'abuse', 'unsafe', 'threat', 'threatening', 'violence', 'assault', 'emergency', 'bully', 'bullying', 'intimidating'].some((word) =>
      comment.includes(word),
    );

    if (hasCriticalLanguage) return SentimentLabel.CRITICAL;
    if (rating <= 2) return SentimentLabel.NEGATIVE;
    if (rating === 3) return SentimentLabel.NEUTRAL;
    return SentimentLabel.POSITIVE;
  }

  private isRejectedComment(comment: string) {
    if (comment.length < 8 || comment.split(' ').length < 2) return true;
    if (
      [
        'good',
        'bad',
        'nice',
        'ok',
        'okay',
        'excellent',
        'average',
        'satisfied',
        'unsatisfied',
        'no problem',
        'nothing',
        'none',
        'na',
      ].includes(comment)
    ) {
      return true;
    }
    if (/(.)\1{5,}/.test(comment)) return true;
    if (!/[a-zA-Z]{3,}/.test(comment)) return true;
    if (
      ['cricket', 'movie', 'phone battery', 'weather', 'traffic', 'pizza coupon', 'shopping'].some((word) =>
        comment.includes(word),
      )
    ) {
      return true;
    }
    const words = comment.split(' ');
    return words.length >= 6 && new Set(words).size / words.length < 0.35;
  }

  private normalizeComment(value: string) {
    return value
      .toLowerCase()
      .replace(/\bwi[\s-]?fi\b/g, 'wifi')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
