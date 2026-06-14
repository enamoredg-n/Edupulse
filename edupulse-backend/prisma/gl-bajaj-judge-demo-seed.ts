import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Department,
  FeedbackCategory,
  FeedbackQuestion,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed judge demo data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TERM_NAME = 'GL Bajaj 8 Category Judge Demo';
const STUDENT_COUNT = 100;
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
    description: 'Course structure, exams, learning support and academic workload.',
    question: 'How satisfied are you with academics this semester?',
  },
  {
    name: 'Faculty',
    description: 'Teaching quality, behaviour, subject knowledge and fairness.',
    question: 'How satisfied are you with faculty this semester?',
  },
  {
    name: 'Mess',
    description: 'Hostel mess quality, hygiene, food availability and serving experience.',
    question: 'How satisfied are you with mess facilities this semester?',
  },
  {
    name: 'Safety',
    description: 'Ragging prevention, campus safety, emergency confidence and misconduct concerns.',
    question: 'How satisfied are you with campus safety this semester?',
  },
  {
    name: 'Placements',
    description: 'Placement access, eligibility clarity, drives and training support.',
    question: 'How satisfied are you with placement support this semester?',
  },
  {
    name: 'Canteen',
    description: 'Canteen food, hygiene, availability and crowd management.',
    question: 'How satisfied are you with canteen services this semester?',
  },
  {
    name: 'Extracurricular',
    description: 'Fests, clubs, events, sports and student participation opportunities.',
    question: 'How satisfied are you with extracurricular activities this semester?',
  },
  {
    name: 'Infrastructure',
    description: 'Classrooms, labs, projectors, seating, Wi-Fi and maintenance.',
    question: 'How satisfied are you with infrastructure this semester?',
  },
];

const nonFacultyIssueComments = [
  'A student reported ragging pressure by seniors near the hostel stairs after evening activity.',
  'Students reported ragging by seniors near the hostel corridor and asked for strict action.',
  'The college fest was very short and many students felt the event ended before proper participation.',
  'Sports items are not available during practice time, including badminton rackets and footballs.',
  'ECE students were not given a fair chance to sit in CS placement drives despite having the required skills.',
  'Students reported corruption in fest budget handling and said money collection was not transparent.',
  'xxxxxxxx',
  'good good good good good',
  'The movie trailer was better than college feedback and the pizza coupon was nice.',
  'trash useless worst terrible',
];

const facultyIssueComments = [
  'Faculty behaviour in class feels rude and dismissive when students ask doubts.',
  'Some faculty members talk harshly to students during doubt sessions.',
  'Faculty behaviour becomes discouraging when students ask basic questions.',
  'Students feel faculty sometimes insult them instead of explaining mistakes.',
  'Faculty communication in class is not respectful during discussions.',
  'Some faculty members ignore doubts and respond rudely in front of the class.',
  'Faculty behaviour during practical sessions makes students hesitate to ask questions.',
  'Students said classroom behaviour from faculty needs serious improvement.',
  'Faculty sometimes scold students without explaining the topic properly.',
  'Faculty behaviour is affecting confidence during lectures and labs.',
  'A student specifically reported harassment by Raghav sir, CS AI faculty, and asked for confidential review.',
  'ajhdvbs qwerty zxcasd',
  'good good good good good',
  'xxxxx',
  'The weather was nice and my phone battery was low.',
  'pizza coupon movie shopping traffic',
  'nice nice nice nice nice',
  '1234567',
  'ok',
  'random random random random random',
  'ECE students reported partiality in practical marks by faculty.',
  'Students feel practical marks are not given fairly and partiality is visible.',
  'Practical marks partiality is reducing trust in the evaluation process.',
  'Faculty lacks knowledge of the subject and cannot explain important concepts clearly.',
  'Some faculty members lack subject knowledge during advanced topics.',
  'Students said lack of subject knowledge is affecting exam preparation.',
  'Faculty needs stronger subject knowledge for practical and theory classes.',
  'Lack of subject knowledge makes lectures confusing for students.',
  'Students need new faculty for difficult technical subjects.',
  'Please assign new faculty because current teaching is not helping students.',
  'Students requested new faculty for better subject explanation.',
  'Need new faculty for this subject because doubts are not solved properly.',
  'A new faculty member is needed to improve learning quality.',
];

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function studentEmail(index: number) {
  return `judge.demo.student.${String(index + 1).padStart(3, '0')}@glbitm.ac.in`;
}

function submissionId(index: number) {
  return `judge_demo_submission_${String(index + 1).padStart(3, '0')}`;
}

function categoryQuestion(
  category: FeedbackCategory,
  questions: FeedbackQuestion[],
) {
  const question = questions.find((item) => item.categoryId === category.id);
  if (!question) {
    throw new Error(`Question missing for category ${category.name}`);
  }
  return question;
}

function ratingAndComment(categoryName: string, studentIndex: number) {
  if (categoryName === 'Faculty') {
    if (studentIndex < 38) return { rating: 4, comment: null };
    if (studentIndex < 67) return { rating: 3, comment: null };
    return {
      rating: 1,
      comment: facultyIssueComments[studentIndex - 67],
    };
  }

  if (studentIndex < 50) return { rating: 4, comment: null };
  if (studentIndex < 90) return { rating: 3, comment: null };
  return {
    rating: 1,
    comment: nonFacultyIssueComments[studentIndex - 90],
  };
}

async function main() {
  console.time('gl-bajaj-judge-demo-seed');
  console.log('Preparing GL Bajaj judge demo dataset');

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
    const existingQuestion = await prisma.feedbackQuestion.findFirst({
      where: {
        collegeId: college.id,
        categoryId: savedCategory.id,
        text: category.question,
      },
      select: { id: true },
    });
    if (existingQuestion) {
      await prisma.feedbackQuestion.update({
        where: { id: existingQuestion.id },
        data: { isActive: true },
      });
    } else {
      await prisma.feedbackQuestion.create({
        data: {
          collegeId: college.id,
          categoryId: savedCategory.id,
          text: category.question,
          isActive: true,
        },
      });
    }
    savedCategories.push(savedCategory);
  }

  const questions = await prisma.feedbackQuestion.findMany({
    where: {
      collegeId: college.id,
      categoryId: { in: savedCategories.map((category) => category.id) },
      text: { in: feedbackBlueprint.map((category) => category.question) },
    },
    orderBy: { text: 'asc' },
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

  const oldSubmissions = await prisma.feedbackSubmission.findMany({
    where: { collegeId: college.id, termId: term.id },
    select: { id: true },
  });
  const oldSubmissionIds = oldSubmissions.map((submission) => submission.id);
  if (oldSubmissionIds.length) {
    await prisma.feedbackResponse.deleteMany({
      where: { collegeId: college.id, submissionId: { in: oldSubmissionIds } },
    });
    await prisma.feedbackSubmission.deleteMany({
      where: { collegeId: college.id, id: { in: oldSubmissionIds } },
    });
  }

  const removedOldGrievances = await prisma.grievance.deleteMany({
    where: { collegeId: college.id },
  });
  if (removedOldGrievances.count) {
    console.log(`Removed old GL Bajaj grievances: ${removedOldGrievances.count}`);
  }

  const passwordHash = await hash(PASSWORD, 10);
  const students = await Promise.all(
    Array.from({ length: STUDENT_COUNT }, async (_, index) => {
      const department = pick(savedDepartments, index);
      return prisma.user.upsert({
        where: {
          email: studentEmail(index),
        },
        update: {
          departmentId: department.id,
          name: `Judge Demo Student ${String(index + 1).padStart(3, '0')}`,
          role: UserRole.STUDENT,
          semesterNumber: 7,
        },
        create: {
          collegeId: college.id,
          departmentId: department.id,
          email: studentEmail(index),
          name: `Judge Demo Student ${String(index + 1).padStart(3, '0')}`,
          passwordHash,
          role: UserRole.STUDENT,
          semesterNumber: 7,
        },
      });
    }),
  );

  await prisma.feedbackSubmission.createMany({
    data: students.map((student, index) => ({
      collegeId: college.id,
      id: submissionId(index),
      studentId: student.id,
      termId: term.id,
    })),
    skipDuplicates: true,
  });

  const responseRows: Prisma.FeedbackResponseCreateManyInput[] = [];
  for (let studentIndex = 0; studentIndex < STUDENT_COUNT; studentIndex += 1) {
    for (const category of savedCategories) {
      const question = categoryQuestion(category, questions);
      const { rating, comment } = ratingAndComment(category.name, studentIndex);
      responseRows.push({
        collegeId: college.id,
        submissionId: submissionId(studentIndex),
        categoryId: category.id,
        questionId: question.id,
        rating,
        comment,
      });
    }
  }

  await prisma.feedbackResponse.createMany({ data: responseRows });

  const categoryChecks = await prisma.feedbackResponse.groupBy({
    by: ['categoryId', 'rating'],
    where: { collegeId: college.id, submission: { termId: term.id } },
    _count: { id: true },
  });
  const categoryNames = new Map(savedCategories.map((category) => [category.id, category.name]));
  console.log('Category rating check');
  for (const category of savedCategories) {
    const rows = categoryChecks.filter((item) => item.categoryId === category.id);
    const satisfied = rows.filter((item) => item.rating >= 4).reduce((sum, item) => sum + item._count.id, 0);
    const average = rows.filter((item) => item.rating === 3).reduce((sum, item) => sum + item._count.id, 0);
    const unsatisfied = rows.filter((item) => item.rating <= 2).reduce((sum, item) => sum + item._count.id, 0);
    console.log(`${categoryNames.get(category.id)}: satisfied=${satisfied}, average=${average}, unsatisfied=${unsatisfied}`);
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
  console.log('GL Bajaj judge demo dataset ready');
  console.log(`Term: ${term.name}`);
  console.log(`Students/submissions: ${STUDENT_COUNT}`);
  console.log(`Categories: ${savedCategories.length}`);
  console.log(`Feedback responses: ${responseCount}`);
  console.log(`Commented responses: ${commentCount}`);
  console.timeEnd('gl-bajaj-judge-demo-seed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
