import {
  duplicateCount,
  hasTitle,
  rejectedCount,
  themeTitles,
  urgentTitles as ultraTitles,
} from './ai-result-utils';

type FeedbackInput = {
  id: string;
  categoryId: string;
  categoryName: string;
  questionId: string;
  questionText: string;
  rating: number;
  comment: string | null;
  departmentCode: string | null;
  semesterNumber: number | null;
};

type AnalysisPayload = {
  term: {
    id: string;
    name: string;
  };
  feedback: FeedbackInput[];
  grievances: [];
};

type AnalysisTheme = {
  title: string;
  mentionCount: number;
  priority: string;
  sentiment: string;
  evidence?: Record<string, unknown>;
};

type AnalysisResult = {
  inputCount: number;
  duplicateCount: number;
  confidence: number;
  lowSampleFlag: boolean;
  rawJson?: {
    qualityChecks?: Record<string, unknown>;
    geminiReasoning?: {
      ultraConcerningIssues?: Array<Record<string, unknown>>;
    };
    sentimentBreakdown?: unknown;
    engineBenchmark?: Record<string, unknown>;
  };
  themes: AnalysisTheme[];
};

type GoldenCase = {
  name: string;
  payload: AnalysisPayload;
  expectations: Array<{
    name: string;
    check: (result: AnalysisResult) => boolean;
    actual: (result: AnalysisResult) => string;
    expected: string;
  }>;
};

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8001';

function feedback(
  index: number,
  categoryName: string,
  comment: string,
  options: Partial<FeedbackInput> = {},
): FeedbackInput {
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: options.id ?? `f-${index}`,
    categoryId: options.categoryId ?? `cat-${slug}`,
    categoryName,
    questionId: options.questionId ?? `q-${slug}`,
    questionText: options.questionText ?? `How satisfied are you with ${categoryName}?`,
    rating: options.rating ?? 1,
    comment,
    departmentCode: options.departmentCode ?? ['CSE', 'ECE', 'IT', 'ME', 'CE'][index % 5],
    semesterNumber: options.semesterNumber ?? ((index % 8) + 1),
  };
}

function payload(name: string, rows: FeedbackInput[]): AnalysisPayload {
  return {
    term: {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
    },
    feedback: rows,
    grievances: [],
  };
}

async function analyze(testPayload: AnalysisPayload): Promise<AnalysisResult> {
  const response = await fetch(`${AI_BASE.replace(/\/$/, '')}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload),
  });

  if (!response.ok) {
    throw new Error(`AI service returned ${response.status} for ${testPayload.term.name}`);
  }

  return (await response.json()) as AnalysisResult;
}

function buildSmallSafetyNoiseCase(): GoldenCase {
  const rows = [
    feedback(1, 'Safety', 'Dev Pratap Rai says Gaurav Sharma ECE 4th year ragged him near hostel stairs.', {
      departmentCode: 'ECE',
      semesterNumber: 1,
    }),
    feedback(2, 'Infrastructure', 'Water pH level contamination is reported in AB3 building near the CS DS drinking water point.', {
      departmentCode: 'CSDS',
      semesterNumber: 3,
    }),
    feedback(3, 'Faculty', 'Raghav sir from CS AI faculty did harassment and physical touch during doubt discussion.', {
      departmentCode: 'CSAI',
      semesterNumber: 5,
    }),
    feedback(4, 'Mess', 'First year hostel mess has insects near the serving counter and tables are not cleaned.', {
      departmentCode: 'ME',
      semesterNumber: 2,
    }),
    feedback(5, 'Mess', 'First year hostel mess has insects near the serving counter and tables are not cleaned.', {
      departmentCode: 'ME',
      semesterNumber: 2,
    }),
    feedback(6, 'Academics', 'ghhvgjhvb ajhdvbs qwerty', { rating: 2 }),
    feedback(7, 'Canteen', 'movie pizza weather phone battery shopping traffic', { rating: 2 }),
  ];

  return {
    name: 'golden_small_safety_noise',
    payload: payload('golden_small_safety_noise', rows),
    expectations: [
      {
        name: 'Reject fake/out-of-context comments',
        expected: '>= 2 rejected comments',
        actual: (result) => `${rejectedCount(result)} rejected`,
        check: (result) => rejectedCount(result) >= 2,
      },
      {
        name: 'Group duplicate mess comment',
        expected: '>= 1 duplicate grouped',
        actual: (result) => `${duplicateCount(result)} duplicates`,
        check: (result) => duplicateCount(result) >= 1,
      },
      {
        name: 'Escalate ragging/water/harassment',
        expected: 'ragging, water contamination and harassment in urgent layer',
        actual: (result) => ultraTitles(result).join(', ') || 'none',
        check: (result) => {
          const titles = ultraTitles(result);
          return (
            hasTitle(titles, 'ragging') &&
            hasTitle(titles, 'water contamination') &&
            hasTitle(titles, 'harassment')
          );
        },
      },
      {
        name: 'Keep mess as normal AI finding',
        expected: 'mess issue visible outside urgent layer',
        actual: (result) => themeTitles(result).join(', ') || 'none',
        check: (result) => hasTitle(themeTitles(result), 'mess hygiene'),
      },
    ],
  };
}

function buildEdgeTaxonomyCase(): GoldenCase {
  const comments = [
    ['Academics', 'Exam schedule has back to back papers and students need a better date sheet gap.'],
    ['Faculty', 'Faculty is absent from morning lectures and several classes start late.'],
    ['Faculty', 'Faculty not attending classes regularly and lectures are missed.'],
    ['Faculty', 'Practical marks partiality is happening and ECE students are worried about unfair internal marks.'],
    ['Mess', 'Hostel mess hygiene is poor and insects were seen near the serving plates.'],
    ['Canteen', 'Canteen queue and billing counter delay is too much during lunch break.'],
    ['Safety', 'First year students reported ragging by seniors near hostel gate.'],
    ['Safety', 'Student reported harassment by a faculty member during lab discussion.'],
    ['Safety', 'Fest money collection was not transparent and students mentioned corruption.'],
    ['Safety', 'A gun firing sound was reported near the parking area and students felt unsafe.'],
    ['Safety', 'A snake was seen near the playground side entry.'],
    ['Safety', 'Contaminated water is coming from the AB3 drinking point.'],
    ['Safety', 'Electric shock risk exists near the open wire beside lab stairs.'],
    ['Safety', 'Ceiling plaster is falling in old classroom and can injure students.'],
    ['Placements', 'ECE students were not allowed to sit in one CS placement drive despite matching skills.'],
    ['Extracurricular', 'Fest was very short and event slots ended before many students could participate.'],
    ['Sports', 'Sports items like badminton rackets and footballs are not available in the sports room.'],
    ['Infrastructure', 'AB2 room 307 projector is broken and classes are affected.'],
    ['Infrastructure', 'AC not working in seminar room and ventilation is poor.'],
    ['Hostel', 'Hostel room maintenance requests are delayed for weeks.'],
    ['Library', 'Library seating is not enough during exam weeks and reading room AC is not working.'],
    ['Labs', 'Lab equipment and practical components are not available during lab hours.'],
    ['Wi-Fi / Internet', 'Wi-Fi is slow in the lab area during project hours.'],
    ['Transport', 'College bus timing is unreliable and the morning pickup point is overcrowded.'],
    ['Administration', 'Scholarship form support is delayed and fee reimbursement documents are not explained clearly.'],
    ['Academics', 'good good good good good good'],
    ['Canteen', 'xxxxx yyyyy zzzzz'],
  ];

  const rows = comments.map(([category, comment], index) =>
    feedback(index + 1, category, comment, {
      rating: index >= comments.length - 2 ? 2 : 1,
      departmentCode: ['CSE', 'ECE', 'IT', 'ME', 'CE'][index % 5],
      semesterNumber: (index % 8) + 1,
    }),
  );

  return {
    name: 'golden_15_category_edge_taxonomy',
    payload: payload('golden_15_category_edge_taxonomy', rows),
    expectations: [
      {
        name: 'Escalate only serious concerns',
        expected: 'ragging, harassment, corruption, weapon, animal, water, electric, building',
        actual: (result) => ultraTitles(result).join(', ') || 'none',
        check: (result) => {
          const titles = ultraTitles(result);
          return [
            'ragging',
            'harassment',
            'corruption',
            'weapon',
            'animal',
            'water contamination',
            'electric',
            'building',
          ].every((fragment) => hasTitle(titles, fragment));
        },
      },
      {
        name: 'Separate faculty root causes',
        expected: 'attendance and marks partiality are separate findings',
        actual: (result) => themeTitles(result).join(', ') || 'none',
        check: (result) => {
          const titles = themeTitles(result);
          return hasTitle(titles, 'attendance') && hasTitle(titles, 'marks partiality');
        },
      },
      {
        name: 'Detect expanded taxonomy buckets',
        expected: 'transport, library, scholarship, exam, projector, AC, lab, sports',
        actual: (result) => themeTitles(result).join(', ') || 'none',
        check: (result) => {
          const titles = themeTitles(result);
          return [
            'transport',
            'library',
            'scholarship',
            'exam',
            'projector',
            'ac',
            'lab',
            'sports',
          ].every((fragment) => hasTitle(titles, fragment));
        },
      },
      {
        name: 'Fake edge comments rejected',
        expected: '>= 2 rejected comments',
        actual: (result) => `${rejectedCount(result)} rejected`,
        check: (result) => rejectedCount(result) >= 2,
      },
      {
        name: 'Urgent issues removed from AI findings',
        expected: 'ragging/harassment/snake/gun not repeated as normal issue cards',
        actual: (result) => themeTitles(result).join(', ') || 'none',
        check: (result) => {
          const titles = themeTitles(result);
          return !['ragging', 'harassment', 'snake', 'weapon', 'gun'].some((fragment) =>
            hasTitle(titles, fragment),
          );
        },
      },
    ],
  };
}

function buildLargeScaleCase(): GoldenCase {
  const patterns = [
    ['Mess', 'Second year hostel mess hygiene is poor and food gets over before mess time.'],
    ['Wi-Fi / Internet', 'Wi-Fi is slow in the lab area during project hours.'],
    ['Faculty', 'Faculty communication is unclear and doubts are not solved after class.'],
    ['Infrastructure', 'AB2 room 307 projector is broken and classes are affected.'],
    ['Sports', 'Sports items like badminton rackets are not available in the sports room.'],
    ['Transport', 'College bus timing is unreliable and the pickup point is overcrowded.'],
    ['Library', 'Library seating is not enough during exam weeks.'],
    ['Administration', 'Scholarship form support is delayed at the office.'],
  ];
  const rows: FeedbackInput[] = [];

  for (let index = 0; index < 10000; index += 1) {
    const [category, comment] = patterns[index % patterns.length];
    rows.push(
      feedback(index + 1, category, comment, {
        rating: index % 11 === 0 ? 2 : 1,
        departmentCode: ['CSE', 'ECE', 'IT', 'ME', 'CE'][index % 5],
        semesterNumber: (index % 8) + 1,
      }),
    );
  }

  for (let index = 0; index < 300; index += 1) {
    rows.push(feedback(11000 + index, 'Academics', 'movie pizza weather phone battery shopping traffic', { rating: 2 }));
  }

  rows.push(
    feedback(12001, 'Safety', 'A student reported harassment by faculty during lab doubt discussion.', {
      departmentCode: 'ECE',
      semesterNumber: 5,
    }),
    feedback(12002, 'Safety', 'First year students reported ragging by seniors near hostel gate.', {
      departmentCode: 'CSE',
      semesterNumber: 1,
    }),
    feedback(12003, 'Infrastructure', 'Contaminated water is coming from AB3 drinking point.', {
      departmentCode: 'CSDS',
      semesterNumber: 3,
    }),
  );

  return {
    name: 'golden_large_10k_scale',
    payload: payload('golden_large_10k_scale', rows),
    expectations: [
      {
        name: 'Scale input accepted',
        expected: '>= 10,000 responses analyzed',
        actual: (result) => `${result.inputCount} responses`,
        check: (result) => result.inputCount >= 10000,
      },
      {
        name: 'Mass duplicate grouping works',
        expected: '>= 9000 duplicates grouped',
        actual: (result) => `${duplicateCount(result)} duplicates`,
        check: (result) => duplicateCount(result) >= 9000,
      },
      {
        name: 'Large fake batch rejected',
        expected: '>= 300 fake comments rejected',
        actual: (result) => `${rejectedCount(result)} rejected`,
        check: (result) => rejectedCount(result) >= 300,
      },
      {
        name: 'Large visible issues remain meaningful',
        expected: 'mess, wifi, faculty, projector, transport, library, scholarship',
        actual: (result) => themeTitles(result).slice(0, 12).join(', ') || 'none',
        check: (result) => {
          const titles = themeTitles(result);
          return ['mess', 'wi-fi', 'faculty', 'projector', 'transport', 'library', 'scholarship'].every(
            (fragment) => hasTitle(titles, fragment),
          );
        },
      },
      {
        name: 'Rare serious risks still escalated in scale data',
        expected: 'ragging, harassment and water contamination urgent',
        actual: (result) => ultraTitles(result).join(', ') || 'none',
        check: (result) => {
          const titles = ultraTitles(result);
          return (
            hasTitle(titles, 'ragging') &&
            hasTitle(titles, 'harassment') &&
            hasTitle(titles, 'water contamination')
          );
        },
      },
    ],
  };
}

async function runCase(test: GoldenCase) {
  const started = Date.now();
  const result = await analyze(test.payload);
  const checks = test.expectations.map((expectation) => {
    const passed = expectation.check(result);
    return {
      name: expectation.name,
      expected: expectation.expected,
      actual: expectation.actual(result),
      passed,
    };
  });

  return {
    name: test.name,
    inputCount: result.inputCount,
    confidence: result.confidence,
    lowSampleFlag: result.lowSampleFlag,
    duplicateCount: duplicateCount(result),
    rejectedCount: rejectedCount(result),
    urgentIssues: ultraTitles(result),
    topThemes: themeTitles(result).slice(0, 12),
    processingMs: Date.now() - started,
    checks,
    result: checks.every((check) => check.passed) ? 'PASS' : 'REVIEW',
  };
}

async function main() {
  const cases = [
    buildSmallSafetyNoiseCase(),
    buildEdgeTaxonomyCase(),
    buildLargeScaleCase(),
  ];
  const results: Array<Awaited<ReturnType<typeof runCase>>> = [];

  for (const test of cases) {
    results.push(await runCase(test));
  }

  const failed = results.filter((result) => result.result !== 'PASS');
  console.log(
    JSON.stringify(
      {
        aiBase: AI_BASE,
        result: failed.length ? 'REVIEW' : 'PASS',
        suites: results,
      },
      null,
      2,
    ),
  );

  if (failed.length) {
    process.exit(1);
  }
}

main().catch((error) => {
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
