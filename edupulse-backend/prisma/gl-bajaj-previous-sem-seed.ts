import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Department,
  FeedbackCategory,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed GL Bajaj previous semester data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TERM_NAME = 'gl_bajaj_previous_sem_data';
const STUDENT_COUNT = 500;
const RESPONSE_BATCH_SIZE = 2500;
const USER_BATCH_SIZE = 500;
const PASSWORD = 'Student@12345';

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
      'How clear are the exam and internal assessment expectations?',
      'How useful are assignments for improving practical understanding?',
    ],
  },
  {
    name: 'Faculty',
    description: 'Teaching quality, doubt solving and classroom support.',
    questions: [
      'How satisfied are you with teaching clarity?',
      'How helpful is faculty support for doubts?',
      'How regularly does faculty connect theory with real-world examples?',
      'How fair and transparent is classroom communication from faculty?',
    ],
  },
  {
    name: 'Infrastructure',
    description: 'Classrooms, labs, Wi-Fi, campus facilities and maintenance.',
    questions: [
      'How satisfied are you with classrooms and labs?',
      'How reliable are Wi-Fi and campus facilities?',
      'How well maintained are projectors, seating and classroom equipment?',
      'How available are lab systems during practical or project work?',
    ],
  },
  {
    name: 'Food & Mess',
    description: 'Mess food, canteen quality, hygiene and availability.',
    questions: [
      'How satisfied are you with food quality?',
      'How satisfied are you with hygiene in mess and canteen?',
      'How good is the variety of food options across the week?',
      'How satisfied are you with serving time and crowd management?',
    ],
  },
  {
    name: 'Sports & Campus',
    description: 'Sports, extracurricular activities and campus experience.',
    questions: [
      'How satisfied are you with sports and extracurricular support?',
      'How satisfied are you with the overall campus experience?',
      'How accessible are clubs, events and student activities?',
      'How safe and comfortable do you feel on campus after regular hours?',
    ],
  },
];

const targetedComments = [
  {
    category: 'Sports & Campus',
    text: 'A snake was seen near the playground boundary after evening practice.',
  },
  {
    category: 'Sports & Campus',
    text: 'Students heard gun firing outside the campus gate and felt unsafe while leaving.',
  },
  {
    category: 'Sports & Campus',
    text: 'One student reported ragging pressure by seniors near the hostel stairs.',
  },
  {
    category: 'Faculty',
    text: 'One student reported harassment by a faculty member and needs confidential review.',
  },
  {
    category: 'Infrastructure',
    text: 'AB2 room 307 projector is broken and classes are affected.',
  },
  {
    category: 'Faculty',
    text: 'ECE students feel some faculty show partiality while giving marks.',
  },
];

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function studentEmail(index: number) {
  return `gl.previous.student.${String(index + 1).padStart(4, '0')}@glbitm.ac.in`;
}

function submissionId(index: number) {
  return `gl_previous_submission_${String(index + 1).padStart(4, '0')}`;
}

function responseSequence(studentIndex: number, questionIndex: number) {
  return studentIndex * 20 + questionIndex;
}

function ratingFor(sequence: number, comment?: string) {
  if (comment) {
    return 1;
  }
  return sequence < 1000 ? 3 : 4;
}

function commentFor(
  categoryName: string,
  usedTargetIndexes: Set<number>,
) {
  const targetIndex = targetedComments.findIndex(
    (item, index) => item.category === categoryName && !usedTargetIndexes.has(index),
  );
  if (targetIndex >= 0) {
    usedTargetIndexes.add(targetIndex);
    return targetedComments[targetIndex].text;
  }
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
  console.time('gl-bajaj-previous-sem-seed');
  console.log('Preparing GL Bajaj previous semester dataset');

  const college = await prisma.college.upsert({
    where: { code: 'GLBAJAJ' },
    update: {
      name: 'G.L. Bajaj Institute of Technology and Management',
      domain: 'glbitm.ac.in',
      isActive: true,
    },
    create: {
      code: 'GLBAJAJ',
      name: 'G.L. Bajaj Institute of Technology and Management',
      domain: 'glbitm.ac.in',
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

  const term = await prisma.academicTerm.upsert({
    where: { collegeId_name: { collegeId: college.id, name: TERM_NAME } },
    update: {
      startsAt: new Date('2025-07-01T00:00:00.000Z'),
      endsAt: new Date('2025-12-31T23:59:59.000Z'),
      isActive: false,
    },
    create: {
      collegeId: college.id,
      name: TERM_NAME,
      startsAt: new Date('2025-07-01T00:00:00.000Z'),
      endsAt: new Date('2025-12-31T23:59:59.000Z'),
      isActive: false,
    },
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
    throw new Error(`Expected 20 GL Bajaj questions, found ${questions.length}`);
  }

  console.log('Removing existing GL Bajaj previous semester submissions/responses');
  await prisma.feedbackResponse.deleteMany({
    where: { collegeId: college.id, submission: { termId: term.id } },
  });
  await prisma.feedbackSubmission.deleteMany({
    where: { collegeId: college.id, termId: term.id },
  });
  const oldReports = await prisma.analysisReport.findMany({
    where: { collegeId: college.id, termId: term.id },
    select: { id: true },
  });
  const oldReportIds = oldReports.map((report) => report.id);
  if (oldReportIds.length) {
    await prisma.actionItem.deleteMany({
      where: { collegeId: college.id, reportId: { in: oldReportIds } },
    });
    await prisma.themeInsight.deleteMany({
      where: { collegeId: college.id, reportId: { in: oldReportIds } },
    });
    await prisma.analysisReport.deleteMany({
      where: { collegeId: college.id, id: { in: oldReportIds } },
    });
  }

  const passwordHash = await hash(PASSWORD, 10);
  const studentRows: Prisma.UserCreateManyInput[] = Array.from(
    { length: STUDENT_COUNT },
    (_, index) => {
      const department = pick(savedDepartments, index);
      return {
        collegeId: college.id,
        departmentId: department.id,
        email: studentEmail(index),
        name: `GL Bajaj Previous Student ${String(index + 1).padStart(4, '0')}`,
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
  }

  const students = await prisma.user.findMany({
    where: {
      collegeId: college.id,
      email: { startsWith: 'gl.previous.student.', endsWith: '@glbitm.ac.in' },
    },
    select: { id: true, email: true },
    orderBy: { email: 'asc' },
  });

  if (students.length < STUDENT_COUNT) {
    throw new Error(`Expected ${STUDENT_COUNT} previous students, found ${students.length}`);
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
  const usedTargetIndexes = new Set<number>();

  for (let studentIndex = 0; studentIndex < STUDENT_COUNT; studentIndex += 1) {
    for (const [questionIndex, question] of questions.entries()) {
      const sequence = responseSequence(studentIndex, questionIndex);
      const comment = commentFor(question.category.name, usedTargetIndexes);
      const rating = ratingFor(sequence, comment);
      responseBuffer.push({
        collegeId: college.id,
        submissionId: submissionId(studentIndex),
        categoryId: question.categoryId,
        questionId: question.id,
        rating,
        comment,
      });
    }

    if (responseBuffer.length >= RESPONSE_BATCH_SIZE) {
      await prisma.feedbackResponse.createMany({ data: responseBuffer });
      insertedResponses += responseBuffer.length;
      responseBuffer.length = 0;
      console.log(`Responses inserted: ${insertedResponses}/${STUDENT_COUNT * questions.length}`);
    }
  }

  if (responseBuffer.length) {
    await prisma.feedbackResponse.createMany({ data: responseBuffer });
    insertedResponses += responseBuffer.length;
  }

  const responseCount = await prisma.feedbackResponse.count({
    where: { collegeId: college.id, submission: { termId: term.id } },
  });
  const commentCount = await prisma.feedbackResponse.count({
    where: {
      collegeId: college.id,
      submission: { termId: term.id },
      comment: { not: null },
    },
  });
  const lowRatingCount = await prisma.feedbackResponse.count({
    where: {
      collegeId: college.id,
      submission: { termId: term.id },
      rating: { lte: 2 },
    },
  });

  console.log('GL Bajaj previous semester dataset ready');
  console.log(`Term: ${TERM_NAME}`);
  console.log(`Students: ${STUDENT_COUNT}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Feedback responses: ${responseCount}`);
  console.log(`Commented responses: ${commentCount}`);
  console.log(`Low-rated responses: ${lowRatingCount}`);
  console.timeEnd('gl-bajaj-previous-sem-seed');
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
