import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Department,
  FeedbackCategory,
  GrievanceSeverity,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed Sharda scale data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const STUDENT_COUNT = Number(process.env.SHARDA_SCALE_STUDENT_COUNT ?? 5000);
const RESPONSE_BATCH_SIZE = Number(
  process.env.SHARDA_SCALE_RESPONSE_BATCH_SIZE ?? 5000,
);
const USER_BATCH_SIZE = 1000;
const PASSWORD = 'Student@12345';
const TERM_NAME = 'Sharda Scale Test Semester 2026';

const departments = [
  { code: 'CSE', name: 'Computer Science Engineering' },
  { code: 'ECE', name: 'Electronics and Communication' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
];

const feedbackBlueprint = [
  {
    name: 'Academics',
    description: 'Course structure, workload, exams and learning clarity.',
    questions: [
      'How satisfied are you with the course structure?',
      'How manageable is the academic workload?',
      'How clear are internal assessment expectations?',
      'How useful are assignments for practical understanding?',
    ],
  },
  {
    name: 'Faculty',
    description: 'Teaching quality, doubt solving and classroom support.',
    questions: [
      'How satisfied are you with teaching clarity?',
      'How helpful is faculty support for doubts?',
      'How well does faculty connect theory with examples?',
      'How fair is classroom communication from faculty?',
    ],
  },
  {
    name: 'Infrastructure',
    description: 'Classrooms, labs, Wi-Fi, campus facilities and maintenance.',
    questions: [
      'How satisfied are you with classrooms and labs?',
      'How reliable are Wi-Fi and campus facilities?',
      'How well maintained are projectors and classroom equipment?',
      'How available are lab systems during practical work?',
    ],
  },
  {
    name: 'Food & Mess',
    description: 'Mess food, canteen quality, hygiene and availability.',
    questions: [
      'How satisfied are you with food quality?',
      'How satisfied are you with mess and canteen hygiene?',
      'How good is the weekly variety of food options?',
      'How satisfied are you with serving time and crowd management?',
    ],
  },
  {
    name: 'Sports & Campus',
    description: 'Sports, extracurricular activities and campus experience.',
    questions: [
      'How satisfied are you with sports support?',
      'How satisfied are you with the overall campus experience?',
      'How accessible are clubs and student activities?',
      'How safe do you feel on campus after regular hours?',
    ],
  },
];

const genuineIssueComments: Record<string, string[]> = {
  Academics: [
    'Assessment schedule is too compressed and revision classes are needed.',
    'Course outcomes are useful but syllabus pace is high for weak students.',
    'Assignment deadlines overlap with lab submissions and become stressful.',
    'Internal marks criteria should be explained earlier in the semester.',
  ],
  Faculty: [
    'Some lectures need more practical examples and slower explanation.',
    'Doubt solving after class is delayed during project weeks.',
    'Faculty support is good but tutorials should be more frequent.',
    'Communication about tests and assignments should be more transparent.',
  ],
  Infrastructure: [
    'Block A washroom is not cleaned properly during afternoon classes.',
    'Wi-Fi is slow in the lab area during project hours.',
    'Projector is not working properly in some classrooms.',
    'Lab systems are slow and equipment availability is limited.',
  ],
  'Food & Mess': [
    'Boys Hostel Mess food is sometimes cold and undercooked.',
    'Students found insects near the mess serving counter twice this month.',
    'Main canteen hygiene needs attention near the washing area.',
    'Food quality is inconsistent and dinner queue management is poor.',
  ],
  'Sports & Campus': [
    'Sports equipment availability is low during evening practice.',
    'Club information reaches students late and participation drops.',
    'Lighting near the sports ground should improve after regular hours.',
    'Campus events are good but registration process is unclear.',
  ],
};

const duplicateComments = [
  'Wi-Fi is slow in the lab area during project hours.',
  'Boys Hostel Mess food is sometimes cold and undercooked.',
  'Block A washroom is not cleaned properly during afternoon classes.',
  'Projector is not working properly in some classrooms.',
  'Doubt solving after class is delayed during project weeks.',
];

const fakeComments = [
  'ghhvgjhvb',
  'ajhdvbs',
  'xxxxx',
  'ok',
  'asdfgh',
  'nice nice nice nice nice',
  'good good good good good',
  '111111111111',
];

const abusiveExtremeComments = [
  'This is the worst system ever and everything feels useless.',
  'The facility management is terrible and no one listens.',
  'This process is trash because the same issue is ignored again.',
  'I am extremely angry because the complaint has not been solved.',
];

const outOfContextComments = [
  'I watched a cricket match yesterday and the batting was nice.',
  'Please add more pizza coupons for movie night.',
  'My phone battery drains fast after the latest update.',
  'The weather was cloudy and traffic was high today.',
];

const safetyComments = [
  'A student reported threatening behaviour near hostel corridor after evening class.',
  'There is harassment-like behaviour near the parking area and students feel unsafe.',
  'A group is intimidating juniors near hostel stairs and it needs confidential review.',
];

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function studentEmail(index: number) {
  return `scale.student.${String(index + 1).padStart(5, '0')}@sharda.edu`;
}

function submissionId(index: number) {
  return `sharda_scale_submission_${String(index + 1).padStart(5, '0')}`;
}

function ratingFor(
  categoryName: string,
  studentIndex: number,
  questionIndex: number,
) {
  const wave = (studentIndex * 11 + questionIndex * 7) % 100;

  if (categoryName === 'Food & Mess') {
    if (wave < 38) return 1;
    if (wave < 68) return 2;
    if (wave < 88) return 3;
    return 4;
  }

  if (categoryName === 'Infrastructure') {
    if (wave < 34) return 1;
    if (wave < 62) return 2;
    if (wave < 86) return 3;
    return 4;
  }

  if (categoryName === 'Faculty') {
    if (wave < 16) return 1;
    if (wave < 42) return 2;
    if (wave < 78) return 3;
    return 4;
  }

  if (wave < 10) return 1;
  if (wave < 30) return 2;
  if (wave < 72) return 3;
  return 4;
}

function commentFor(
  categoryName: string,
  rating: number,
  studentIndex: number,
  questionIndex: number,
) {
  const signal = studentIndex * 37 + questionIndex * 19;

  if (signal % 211 === 0) return pick(safetyComments, signal);
  if (signal % 97 === 0) return pick(fakeComments, signal);
  if (signal % 89 === 0) return pick(abusiveExtremeComments, signal);
  if (signal % 83 === 0) return pick(outOfContextComments, signal);
  if (signal % 31 === 0) return pick(duplicateComments, signal);
  if (rating <= 2)
    return pick(
      genuineIssueComments[categoryName] ?? genuineIssueComments.Academics,
      signal,
    );
  if (rating === 3 && signal % 5 === 0)
    return pick(
      genuineIssueComments[categoryName] ?? genuineIssueComments.Academics,
      signal,
    );
  return undefined;
}

async function seedQuestions(
  collegeId: string,
  categoryId: string,
  questions: string[],
) {
  for (const text of questions) {
    const existing = await prisma.feedbackQuestion.findFirst({
      where: { collegeId, categoryId, text },
      select: { id: true },
    });

    if (!existing) {
      await prisma.feedbackQuestion.create({
        data: { collegeId, categoryId, text, isActive: true },
      });
    } else {
      await prisma.feedbackQuestion.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
  }
}

async function main() {
  console.time('sharda-scale-seed');
  console.log(`Preparing Sharda scale dataset for ${STUDENT_COUNT} students`);

  const college = await prisma.college.upsert({
    where: { code: 'SHARDA' },
    update: {
      name: 'Sharda University',
      domain: 'sharda.ac.in',
      isActive: true,
    },
    create: {
      code: 'SHARDA',
      name: 'Sharda University',
      domain: 'sharda.ac.in',
      isActive: true,
    },
  });

  const savedDepartments: Department[] = [];
  for (const department of departments) {
    savedDepartments.push(
      await prisma.department.upsert({
        where: {
          collegeId_code: { collegeId: college.id, code: department.code },
        },
        update: { name: department.name },
        create: { ...department, collegeId: college.id },
      }),
    );
  }

  await prisma.academicTerm.updateMany({
    where: { collegeId: college.id },
    data: { isActive: false },
  });

  const term = await prisma.academicTerm.upsert({
    where: { collegeId_name: { collegeId: college.id, name: TERM_NAME } },
    update: {
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-06-30T23:59:59.000Z'),
      isActive: true,
    },
    create: {
      collegeId: college.id,
      name: TERM_NAME,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-06-30T23:59:59.000Z'),
      isActive: true,
    },
  });

  await prisma.feedbackQuestion.updateMany({
    where: { collegeId: college.id },
    data: { isActive: false },
  });

  const savedCategories: FeedbackCategory[] = [];
  for (const category of feedbackBlueprint) {
    const savedCategory = await prisma.feedbackCategory.upsert({
      where: { collegeId_name: { collegeId: college.id, name: category.name } },
      update: { description: category.description },
      create: {
        collegeId: college.id,
        name: category.name,
        description: category.description,
      },
    });
    await seedQuestions(college.id, savedCategory.id, category.questions);
    savedCategories.push(savedCategory);
  }

  const questions = await prisma.feedbackQuestion.findMany({
    where: {
      collegeId: college.id,
      categoryId: { in: savedCategories.map((category) => category.id) },
      text: { in: feedbackBlueprint.flatMap((category) => category.questions) },
    },
    include: { category: true },
    orderBy: [{ categoryId: 'asc' }, { createdAt: 'asc' }],
  });

  if (questions.length !== 20) {
    throw new Error(
      `Expected 20 active scale questions, found ${questions.length}`,
    );
  }

  console.log('Removing previous Sharda scale submissions/responses');
  await prisma.feedbackResponse.deleteMany({
    where: { collegeId: college.id, submission: { termId: term.id } },
  });
  await prisma.feedbackSubmission.deleteMany({
    where: { collegeId: college.id, termId: term.id },
  });
  await prisma.grievance.deleteMany({
    where: {
      collegeId: college.id,
      title: { startsWith: '[Scale]' },
    },
  });

  const passwordHash = await hash(PASSWORD, 10);
  const studentRows: Prisma.UserCreateManyInput[] = Array.from(
    { length: STUDENT_COUNT },
    (_, index) => {
      const department = pick(savedDepartments, index);
      return {
        collegeId: college.id,
        departmentId: department.id,
        email: studentEmail(index),
        name: `Sharda Scale Student ${String(index + 1).padStart(5, '0')}`,
        passwordHash,
        role: UserRole.STUDENT,
        semesterNumber: 3 + (index % 6),
      };
    },
  );

  for (let start = 0; start < studentRows.length; start += USER_BATCH_SIZE) {
    await prisma.user.createMany({
      data: studentRows.slice(start, start + USER_BATCH_SIZE),
      skipDuplicates: true,
    });
    console.log(
      `Students ready: ${Math.min(start + USER_BATCH_SIZE, STUDENT_COUNT)}/${STUDENT_COUNT}`,
    );
  }

  const students = await prisma.user.findMany({
    where: {
      collegeId: college.id,
      email: { startsWith: 'scale.student.', endsWith: '@sharda.edu' },
    },
    select: {
      id: true,
      email: true,
    },
    orderBy: { email: 'asc' },
  });

  if (students.length < STUDENT_COUNT) {
    throw new Error(
      `Expected ${STUDENT_COUNT} scale students, found ${students.length}`,
    );
  }

  await prisma.feedbackSubmission.createMany({
    data: students.slice(0, STUDENT_COUNT).map((student, index) => ({
      collegeId: college.id,
      id: submissionId(index),
      studentId: student.id,
      termId: term.id,
    })),
    skipDuplicates: true,
  });

  const responseBuffer: Prisma.FeedbackResponseCreateManyInput[] = [];
  let insertedResponses = 0;

  for (let studentIndex = 0; studentIndex < STUDENT_COUNT; studentIndex += 1) {
    for (const [questionIndex, question] of questions.entries()) {
      const categoryName = question.category.name;
      const rating = ratingFor(categoryName, studentIndex, questionIndex);
      responseBuffer.push({
        collegeId: college.id,
        submissionId: submissionId(studentIndex),
        categoryId: question.categoryId,
        questionId: question.id,
        rating,
        comment: commentFor(categoryName, rating, studentIndex, questionIndex),
      });
    }

    if (responseBuffer.length >= RESPONSE_BATCH_SIZE) {
      await prisma.feedbackResponse.createMany({ data: responseBuffer });
      insertedResponses += responseBuffer.length;
      responseBuffer.length = 0;
      console.log(
        `Responses inserted: ${insertedResponses}/${STUDENT_COUNT * questions.length}`,
      );
    }
  }

  if (responseBuffer.length) {
    await prisma.feedbackResponse.createMany({ data: responseBuffer });
    insertedResponses += responseBuffer.length;
  }

  const grievanceRows: Prisma.GrievanceCreateManyInput[] = Array.from(
    { length: 250 },
    (_, index) => {
      const safety = index % 10 === 0;
      const food = index % 4 === 0;
      const wifi = index % 3 === 0;
      const category = safety
        ? 'Safety/Harassment'
        : food
          ? 'Food & Mess'
          : wifi
            ? 'Wi-Fi'
            : 'Infrastructure';
      const severity = safety
        ? GrievanceSeverity.CRITICAL
        : food
          ? GrievanceSeverity.HIGH
          : wifi
            ? GrievanceSeverity.MEDIUM
            : GrievanceSeverity.LOW;

      return {
        collegeId: college.id,
        category,
        title: `[Scale] ${category} issue ${String(index + 1).padStart(3, '0')}`,
        description: safety
          ? 'Student reported harassment-like behaviour and unsafe movement near hostel corridor.'
          : food
            ? 'Students reported cold food, hygiene concerns and insects near the serving counter.'
            : wifi
              ? 'Internet connectivity drops during project and lab hours.'
              : 'Classroom maintenance, projector and washroom cleanliness need attention.',
        severity,
        isAnonymous: index % 2 === 0,
        safetyFlag: safety,
        reporterId:
          index % 2 === 0 ? undefined : students[index % students.length].id,
      };
    },
  );

  await prisma.grievance.createMany({ data: grievanceRows });

  const responseCount = await prisma.feedbackResponse.count({
    where: { collegeId: college.id, submission: { termId: term.id } },
  });
  const submissionCount = await prisma.feedbackSubmission.count({
    where: { collegeId: college.id, termId: term.id },
  });
  const commentCount = await prisma.feedbackResponse.count({
    where: {
      collegeId: college.id,
      submission: { termId: term.id },
      comment: { not: null },
    },
  });
  const grievanceCount = await prisma.grievance.count({
    where: { collegeId: college.id, title: { startsWith: '[Scale]' } },
  });

  console.log('Sharda scale dataset ready');
  console.log(`Students: ${STUDENT_COUNT}`);
  console.log(`Submissions: ${submissionCount}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Feedback responses: ${responseCount}`);
  console.log(`Commented responses: ${commentCount}`);
  console.log(`Scale grievances: ${grievanceCount}`);
  console.timeEnd('sharda-scale-seed');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
