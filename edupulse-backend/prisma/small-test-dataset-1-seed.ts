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
  throw new Error('DATABASE_URL is required to seed small_test_dataset_1');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TERM_NAME = 'small_test_dataset_1';
const STUDENT_COUNT = 10;
const PASSWORD = 'Student@12345';

const departments = [
  { code: 'CSE', name: 'Computer Science Engineering' },
  { code: 'ECE', name: 'Electronics and Communication' },
  { code: 'CSDS', name: 'Computer Science and Data Science' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'ME', name: 'Mechanical Engineering' },
];

const categories = [
  {
    name: 'Safety',
    description: 'Ragging, bullying, harassment, violence and campus safety concerns.',
    question: 'How safe do you feel on campus this semester?',
  },
  {
    name: 'Infrastructure',
    description: 'Buildings, classrooms, drinking water, maintenance and campus facilities.',
    question: 'How satisfied are you with infrastructure and campus facilities?',
  },
  {
    name: 'Faculty',
    description: 'Faculty behaviour, misconduct, teaching support and classroom trust.',
    question: 'How satisfied are you with faculty behaviour and support?',
  },
  {
    name: 'Mess',
    description: 'Hostel mess hygiene, food quality, food availability and cleanliness.',
    question: 'How satisfied are you with mess food and hygiene?',
  },
  {
    name: 'Academics',
    description: 'Academic support, classes, assignments and study experience.',
    question: 'How satisfied are you with academic support?',
  },
];

const studentProfiles = [
  {
    departmentCode: 'CSE',
    email: 'dev.pratap.rai.small1@glbitm.ac.in',
    name: 'Dev Pratap Rai',
    semesterNumber: 1,
  },
  {
    departmentCode: 'CSDS',
    email: 'small.test.02@glbitm.ac.in',
    name: 'CS DS Water Test Student',
    semesterNumber: 3,
  },
  {
    departmentCode: 'ECE',
    email: 'small.test.03@glbitm.ac.in',
    name: 'Small Test Student 03',
    semesterNumber: 4,
  },
  {
    departmentCode: 'IT',
    email: 'small.test.04@glbitm.ac.in',
    name: 'Small Test Student 04',
    semesterNumber: 5,
  },
  {
    departmentCode: 'ECE',
    email: 'small.test.05@glbitm.ac.in',
    name: 'Small Test Student 05',
    semesterNumber: 4,
  },
  {
    departmentCode: 'ECE',
    email: 'small.test.06@glbitm.ac.in',
    name: 'Small Test Student 06',
    semesterNumber: 6,
  },
  {
    departmentCode: 'CSE',
    email: 'small.test.07@glbitm.ac.in',
    name: 'Small Test Student 07',
    semesterNumber: 2,
  },
  {
    departmentCode: 'ME',
    email: 'small.test.08@glbitm.ac.in',
    name: 'Small Test Student 08',
    semesterNumber: 4,
  },
  {
    departmentCode: 'IT',
    email: 'small.test.09@glbitm.ac.in',
    name: 'Small Test Student 09',
    semesterNumber: 6,
  },
  {
    departmentCode: 'CSE',
    email: 'small.test.10@glbitm.ac.in',
    name: 'Small Test Student 10',
    semesterNumber: 8,
  },
];

const feedbackRows: Array<{
  categoryName: string;
  comment: string;
  rating: number;
  studentIndex: number;
}> = [
  {
    categoryName: 'Safety',
    comment:
      'My name is Dev Pratap Rai. Gaurav Sharma from ECE 4th year ragged me near the hostel corridor and I felt unsafe.',
    rating: 1,
    studentIndex: 0,
  },
  {
    categoryName: 'Infrastructure',
    comment:
      'Water pH level contamination is reported in AB3 building on the CS DS campus side and students are worried about drinking water safety.',
    rating: 1,
    studentIndex: 1,
  },
  {
    categoryName: 'Academics',
    comment: 'ghhvgjhvb ajhdvbs qwerty',
    rating: 3,
    studentIndex: 2,
  },
  {
    categoryName: 'Academics',
    comment: 'movie pizza weather phone battery shopping traffic',
    rating: 3,
    studentIndex: 3,
  },
  {
    categoryName: 'Faculty',
    comment:
      'A faculty member used harassment-like language in class and students are scared to report it openly.',
    rating: 1,
    studentIndex: 4,
  },
  {
    categoryName: 'Faculty',
    comment:
      'Faculty harassment during doubt sessions is making students uncomfortable and they want confidential action.',
    rating: 1,
    studentIndex: 5,
  },
  {
    categoryName: 'Faculty',
    comment:
      'A teacher behaved in a harassing way with students after practical class and students do not feel safe raising it directly.',
    rating: 1,
    studentIndex: 6,
  },
  {
    categoryName: 'Mess',
    comment: 'First year hostel mess has poor food quality and students are unhappy with dinner service.',
    rating: 2,
    studentIndex: 0,
  },
  {
    categoryName: 'Mess',
    comment: 'Second year hostel mess cleanliness is poor and tables are not cleaned before meals.',
    rating: 2,
    studentIndex: 1,
  },
  {
    categoryName: 'Mess',
    comment:
      'Third year hostel mess hygiene is weak, insects were seen near the second year food counter, and food quantity gets over before mess time ends.',
    rating: 2,
    studentIndex: 2,
  },
];

function submissionId(index: number) {
  return `small-test-dataset-1-submission-${String(index + 1).padStart(2, '0')}`;
}

async function ensureQuestion(
  collegeId: string,
  category: FeedbackCategory,
  text: string,
) {
  const existing = await prisma.feedbackQuestion.findFirst({
    where: {
      collegeId,
      categoryId: category.id,
      text,
    },
    select: { id: true },
  });
  if (existing) {
    return prisma.feedbackQuestion.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
  }
  return prisma.feedbackQuestion.create({
    data: {
      collegeId,
      categoryId: category.id,
      text,
      isActive: true,
    },
  });
}

function questionForCategory(
  category: FeedbackCategory,
  questions: FeedbackQuestion[],
) {
  const question = questions.find((item) => item.categoryId === category.id);
  if (!question) {
    throw new Error(`Missing question for ${category.name}`);
  }
  return question;
}

async function main() {
  console.log('Preparing small_test_dataset_1');

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
      startsAt: new Date('2026-08-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      isActive: true,
    },
    create: {
      collegeId: college.id,
      name: TERM_NAME,
      startsAt: new Date('2026-08-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      isActive: true,
    },
  });

  const savedCategories: FeedbackCategory[] = [];
  for (const category of categories) {
    const savedCategory = await prisma.feedbackCategory.upsert({
      where: { collegeId_name: { collegeId: college.id, name: category.name } },
      update: { description: category.description },
      create: {
        collegeId: college.id,
        name: category.name,
        description: category.description,
      },
    });
    await ensureQuestion(college.id, savedCategory, category.question);
    savedCategories.push(savedCategory);
  }

  const questions = await prisma.feedbackQuestion.findMany({
    where: {
      collegeId: college.id,
      categoryId: { in: savedCategories.map((category) => category.id) },
      text: { in: categories.map((category) => category.question) },
    },
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

  const passwordHash = await hash(PASSWORD, 10);
  const students = await Promise.all(
    studentProfiles.map((profile) => {
      const department = savedDepartments.find((item) => item.code === profile.departmentCode);
      if (!department) {
        throw new Error(`Missing department ${profile.departmentCode}`);
      }
      return prisma.user.upsert({
        where: { email: profile.email },
        update: {
          collegeId: college.id,
          departmentId: department.id,
          name: profile.name,
          role: UserRole.STUDENT,
          semesterNumber: profile.semesterNumber,
        },
        create: {
          collegeId: college.id,
          departmentId: department.id,
          email: profile.email,
          name: profile.name,
          passwordHash,
          role: UserRole.STUDENT,
          semesterNumber: profile.semesterNumber,
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

  const categoryByName = new Map(savedCategories.map((category) => [category.name, category]));
  const responseRows: Prisma.FeedbackResponseCreateManyInput[] = feedbackRows.map((row) => {
    const category = categoryByName.get(row.categoryName);
    if (!category) {
      throw new Error(`Missing category ${row.categoryName}`);
    }
    const question = questionForCategory(category, questions);
    return {
      collegeId: college.id,
      submissionId: submissionId(row.studentIndex),
      categoryId: category.id,
      questionId: question.id,
      rating: row.rating,
      comment: row.comment,
    };
  });

  await prisma.feedbackResponse.createMany({ data: responseRows });

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
  const rejectedSeedExamples = feedbackRows.filter((row) =>
    ['ghhvgjhvb', 'movie pizza'].some((text) => row.comment.includes(text)),
  ).length;

  console.log('small_test_dataset_1 ready');
  console.log(`Students/submissions: ${submissionCount}`);
  console.log(`Commented feedback answers: ${commentCount}`);
  console.log(`Total response rows: ${responseCount}`);
  console.log(`Expected fake/outlier comments: ${rejectedSeedExamples}`);
  console.log('Expected urgent concerns: ragging, water contamination, faculty harassment');
  console.log('Expected normal AI finding: mess issue grouped from 3 mess comments');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
