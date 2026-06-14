import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hasTitle, rejectedCount, themeTitles, urgentTitles } from './ai-result-utils';

type AnalysisResult = {
  inputCount: number;
  duplicateCount: number;
  rawJson?: {
    qualityChecks?: Record<string, unknown>;
    geminiReasoning?: {
      ultraConcerningIssues?: Array<Record<string, unknown>>;
    };
  };
  themes: Array<{
    title: string;
    mentionCount: number;
    priority: string;
  }>;
};

type FeedbackPayloadRow = {
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

type DatasetExpectation = {
  termName: string;
  minResponses: number;
  urgentIncludes: string[];
  themeIncludes: string[];
  minRejected?: number;
  minDuplicates?: number;
};

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8001';
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required for dataset audit');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const expectations: DatasetExpectation[] = [
  {
    termName: 'small_test_dataset_1',
    minResponses: 10,
    urgentIncludes: ['ragging', 'water contamination', 'harassment'],
    themeIncludes: ['mess hygiene'],
    minRejected: 2,
  },
  {
    termName: 'test_dataset2_edge_cases',
    minResponses: 100,
    urgentIncludes: [
      'ragging',
      'harassment',
      'corruption',
      'weapon',
      'animal',
      'water contamination',
      'electric',
      'building',
    ],
    themeIncludes: [
      'wi-fi',
      'mess hygiene',
      'placement',
      'subject knowledge',
      'sports',
      'hostel',
      'lab',
      'fest',
      'transport',
      'library',
      'administration',
    ],
    minRejected: 2,
  },
  {
    termName: 'GL Bajaj 8 Category Judge Demo',
    minResponses: 800,
    urgentIncludes: ['ragging', 'harassment', 'corruption'],
    themeIncludes: [
      'faculty behaviour',
      'sports item',
      'subject knowledge',
      'marks partiality',
      'placement',
      'fest',
    ],
  },
  {
    termName: 'gl_bajaj_previous_sem_data',
    minResponses: 10000,
    urgentIncludes: ['ragging', 'harassment', 'weapon', 'animal'],
    themeIncludes: ['projector', 'marks partiality'],
  },
  {
    termName: 'Sharda Scale Test Semester 2026',
    minResponses: 100000,
    urgentIncludes: ['harassment'],
    themeIncludes: ['mess hygiene', 'sports item', 'wi-fi', 'projector', 'washroom'],
    minRejected: 1000,
    minDuplicates: 50000,
  },
];

async function analyze(payload: unknown): Promise<AnalysisResult> {
  let response: Response | null = null;
  let lastError = '';

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await fetch(`${AI_BASE.replace(/\/$/, '')}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Connection: 'close' },
        body: JSON.stringify(payload),
      });
      break;
    } catch (error) {
      const cause =
        error instanceof Error && 'cause' in error
          ? `; cause=${String((error as Error & { cause?: unknown }).cause)}`
          : '';
      lastError = `${
        error instanceof Error ? error.message : String(error)
      }${cause}`;
      if (attempt < 2) {
        console.error(`AI request failed (${lastError}); retrying once`);
      }
    }
  }

  if (!response) {
    throw new Error(`AI service request failed: ${lastError || 'unknown error'}`);
  }

  if (!response.ok) {
    throw new Error(`AI service returned ${response.status}`);
  }

  return (await response.json()) as AnalysisResult;
}

async function buildPayload(termName: string) {
  const term = await prisma.academicTerm.findFirst({
    where: { name: termName },
    include: { college: true },
  });

  if (!term) {
    throw new Error(`Dataset term not found: ${termName}`);
  }

  const responses = await prisma.feedbackResponse.findMany({
    where: {
      collegeId: term.collegeId,
      submission: { termId: term.id },
    },
    include: {
      category: true,
      question: true,
      submission: {
        include: {
          student: {
            include: {
              department: true,
            },
          },
        },
      },
    },
  });

  const feedbackRows = responses.map((response) => ({
    id: response.id,
    categoryId: response.categoryId,
    categoryName: response.category.name,
    questionId: response.questionId,
    questionText: response.question.text,
    rating: response.rating,
    comment: response.comment?.trim() ? response.comment.trim() : null,
    departmentCode: response.submission.student.department?.code ?? null,
    semesterNumber: response.submission.student.semesterNumber ?? null,
  }));
  const compactedFeedbackRows = compactFeedbackRows(feedbackRows);

  return {
    term: {
      id: term.id,
      name: term.name,
    },
    college: term.college.code,
    responseRows: responses.length,
    compactedRows: compactedFeedbackRows.length,
    payload: {
      term: {
        id: term.id,
        name: term.name,
      },
      feedback: compactedFeedbackRows,
      grievances: [],
    },
  };
}

function compactFeedbackRows(rows: FeedbackPayloadRow[]) {
  const compacted = new Map<string, FeedbackPayloadRow>();

  for (const row of rows) {
    const key = [
      row.categoryId,
      row.questionId,
      row.rating,
      normalizeComment(row.comment),
      row.departmentCode ?? '',
      row.semesterNumber ?? '',
    ].join('::');
    const existing = compacted.get(key);

    if (existing) {
      existing.weight = (existing.weight ?? 1) + 1;
      continue;
    }

    compacted.set(key, { ...row, weight: 1 });
  }

  return [...compacted.values()];
}

function normalizeComment(comment: string | null) {
  return (comment ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function runDataset(expectation: DatasetExpectation) {
  const started = Date.now();
  console.error(`Auditing dataset: ${expectation.termName}`);
  const data = await buildPayload(expectation.termName);
  console.error(
    `Built payload for ${expectation.termName}: ${data.responseRows} feedback rows compacted to ${data.compactedRows}`,
  );
  const result = await analyze(data.payload);
  const urgent = urgentTitles(result);
  const themes = themeTitles(result);
  const checks = [
    {
      name: 'response volume',
      expected: `>= ${expectation.minResponses}`,
      actual: `${result.inputCount}`,
      passed: result.inputCount >= expectation.minResponses,
    },
    ...expectation.urgentIncludes.map((fragment) => ({
      name: `urgent includes ${fragment}`,
      expected: fragment,
      actual: urgent.join(', ') || 'none',
      passed: hasTitle(urgent, fragment),
    })),
    ...expectation.themeIncludes.map((fragment) => ({
      name: `theme includes ${fragment}`,
      expected: fragment,
      actual: themes.slice(0, 16).join(', ') || 'none',
      passed: hasTitle(themes, fragment),
    })),
  ];

  if (expectation.minRejected !== undefined) {
    checks.push({
      name: 'rejected low-quality comments',
      expected: `>= ${expectation.minRejected}`,
      actual: `${rejectedCount(result)}`,
      passed: rejectedCount(result) >= expectation.minRejected,
    });
  }

  if (expectation.minDuplicates !== undefined) {
    checks.push({
      name: 'duplicate grouping',
      expected: `>= ${expectation.minDuplicates}`,
      actual: `${result.duplicateCount}`,
      passed: result.duplicateCount >= expectation.minDuplicates,
    });
  }

  return {
    termName: expectation.termName,
    college: data.college,
    dbResponseRows: data.responseRows,
    aiInputCount: result.inputCount,
    rejectedCount: rejectedCount(result),
    duplicateCount: result.duplicateCount,
    urgentIssues: urgent,
    topThemes: themes.slice(0, 16),
    processingMs: Date.now() - started,
    checks,
    result: checks.every((check) => check.passed) ? 'PASS' : 'REVIEW',
  };
}

async function main() {
  try {
    const results: Array<Awaited<ReturnType<typeof runDataset>>> = [];

    for (const expectation of expectations) {
      results.push(await runDataset(expectation));
    }

    const failed = results.filter((item) => item.result !== 'PASS');
    console.log(
      JSON.stringify(
        {
          aiBase: AI_BASE,
          result: failed.length ? 'REVIEW' : 'PASS',
          datasets: results,
        },
        null,
        2,
      ),
    );

    if (failed.length) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(
    JSON.stringify(
      {
        aiBase: AI_BASE,
        result: 'FAIL',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
