import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Department,
  FeedbackCategory,
  GrievanceSeverity,
  PrismaClient,
  User,
  UserRole,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed mock AI data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const STUDENT_COUNT = Number(process.env.MOCK_STUDENT_COUNT ?? 500);
const PASSWORD = 'Student@12345';

const departments = [
  { code: 'CSE', name: 'Computer Science Engineering' },
  { code: 'ECE', name: 'Electronics and Communication' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
  { code: 'IT', name: 'Information Technology' },
];

const feedbackBlueprint = [
  {
    name: 'Academics',
    description: 'Course structure, workload, exams and learning clarity.',
    questions: [
      'How satisfied are you with the course structure?',
      'How manageable is the academic workload?',
      'How clear are the exam and internal assessment expectations?',
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

const commentsByCategory: Record<string, string[]> = {
  Academics: [
    'The syllabus is useful but exam load feels high during mid semester.',
    'Assignments are practical but deadlines often overlap with lab work.',
    'Course outcomes are clear and the academic plan is easy to follow.',
    'More revision sessions are needed before internal exams.',
    'Some topics move too fast and need better explanation.',
    'The academic calendar is well planned this semester.',
  ],
  Faculty: [
    'Faculty explains clearly and gives helpful examples in class.',
    'Doubt solving should be faster after lectures.',
    'Some teachers are supportive but practical examples can improve.',
    'Classroom communication is fair and transparent.',
    'Faculty availability after class is limited during project weeks.',
    'More real industry examples should be discussed.',
  ],
  Infrastructure: [
    'Wi-Fi is slow in the lab area during project hours.',
    'Projector is not working properly in some classrooms.',
    'Lab systems are slow and need maintenance.',
    'Classrooms are clean but seating maintenance can improve.',
    'Internet is not reliable during practical work.',
    'Equipment availability is limited during peak lab sessions.',
  ],
  'Food & Mess': [
    'Mess food is sometimes cold and repetitive.',
    'Canteen hygiene needs attention near the serving counter.',
    'Food quality is inconsistent across the week.',
    'Serving time is crowded and queue management can improve.',
    'Food variety is good but taste can be improved.',
    'Water and plate cleanliness should be checked regularly.',
  ],
  'Sports & Campus': [
    'Sports facilities are good but timings are limited.',
    'More extracurricular events should be planned.',
    'Campus experience is positive overall.',
    'Club activities are helpful but information reaches late.',
    'Sports equipment availability should improve.',
    'Campus feels safe but lighting near some areas can improve.',
  ],
};

const uselessComments = [
  'ok',
  'good',
  'asdf',
  'nice nice nice nice nice',
  'xxxxx',
  'fine',
];
const duplicateComments = [
  'Wi-Fi is slow in the lab area during project hours.',
  'Mess food is sometimes cold and repetitive.',
  'Projector is not working properly in some classrooms.',
];

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function ratingFor(
  categoryName: string,
  studentIndex: number,
  questionIndex: number,
) {
  const baseByCategory: Record<string, number> = {
    Academics: 3,
    Faculty: 3,
    Infrastructure: 2,
    'Food & Mess': 2,
    'Sports & Campus': 3,
  };
  const wave = (studentIndex + questionIndex) % 10;
  const base = baseByCategory[categoryName] ?? 3;

  if (categoryName === 'Infrastructure' && wave <= 3) return 1;
  if (categoryName === 'Food & Mess' && wave <= 4) return 2;
  if (wave === 0) return Math.max(1, base - 1);
  if (wave >= 7) return Math.min(4, base + 1);
  return base;
}

function commentFor(
  categoryName: string,
  rating: number,
  studentIndex: number,
  questionIndex: number,
) {
  const signal = studentIndex * 31 + questionIndex * 17;

  if (signal % 97 === 0) return pick(uselessComments, signal);
  if (signal % 43 === 0) return pick(duplicateComments, signal);
  if (rating >= 3 && signal % 4 !== 0) return undefined;

  return pick(
    commentsByCategory[categoryName] ?? ['Feedback is useful.'],
    signal,
  );
}

async function seedQuestions(
  collegeId: string,
  categoryId: string,
  questions: string[],
) {
  for (const text of questions) {
    const existingQuestion = await prisma.feedbackQuestion.findFirst({
      where: { collegeId, categoryId, text },
    });

    if (!existingQuestion) {
      await prisma.feedbackQuestion.create({
        data: { collegeId, categoryId, text },
      });
    }
  }
}

async function main() {
  console.time('mock-ai-seed');

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
    where: {
      collegeId_name: {
        collegeId: college.id,
        name: 'AI Stress Test Semester 2026',
      },
    },
    update: {
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-06-30T23:59:59.000Z'),
      isActive: true,
    },
    create: {
      collegeId: college.id,
      name: 'AI Stress Test Semester 2026',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-06-30T23:59:59.000Z'),
      isActive: true,
    },
  });

  await prisma.academicTerm.updateMany({
    where: { collegeId: college.id, id: { not: term.id } },
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

  const adminPasswordHash = await hash('Admin@12345', 10);
  await prisma.user.upsert({
    where: { email: 'admin@edupulse.edu' },
    update: {
      name: 'EduPulse Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      collegeId: college.id,
    },
    create: {
      collegeId: college.id,
      name: 'EduPulse Admin',
      email: 'admin@edupulse.edu',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const passwordHash = await hash(PASSWORD, 10);
  const students: User[] = [];
  for (let index = 0; index < STUDENT_COUNT; index += 1) {
    const department = pick(savedDepartments, index);
    const semesterNumber = 3 + (index % 6);
    const roll = String(index + 1).padStart(4, '0');

    students.push(
      await prisma.user.upsert({
        where: { email: `mock.student.${roll}@edupulse.edu` },
        update: {
          name: `Mock Student ${roll}`,
          passwordHash,
          role: UserRole.STUDENT,
          collegeId: college.id,
          departmentId: department.id,
          semesterNumber,
        },
        create: {
          name: `Mock Student ${roll}`,
          email: `mock.student.${roll}@edupulse.edu`,
          passwordHash,
          role: UserRole.STUDENT,
          collegeId: college.id,
          departmentId: department.id,
          semesterNumber,
        },
      }),
    );
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

  for (const [studentIndex, student] of students.entries()) {
    const submission = await prisma.feedbackSubmission.upsert({
      where: { studentId_termId: { studentId: student.id, termId: term.id } },
      update: {},
      create: {
        collegeId: college.id,
        studentId: student.id,
        termId: term.id,
      },
    });

    await prisma.feedbackResponse.deleteMany({
      where: { submissionId: submission.id },
    });

    await prisma.feedbackResponse.createMany({
      data: questions.map((question, questionIndex) => {
        const categoryName = question.category.name;
        const rating = ratingFor(categoryName, studentIndex, questionIndex);

        return {
          submissionId: submission.id,
          collegeId: college.id,
          categoryId: question.categoryId,
          questionId: question.id,
          rating,
          comment: commentFor(
            categoryName,
            rating,
            studentIndex,
            questionIndex,
          ),
        };
      }),
    });

    if ((studentIndex + 1) % 100 === 0) {
      console.log(`Created feedback for ${studentIndex + 1} students`);
    }
  }

  await prisma.grievance.deleteMany({
    where: {
      collegeId: college.id,
      title: {
        startsWith: '[Mock AI]',
      },
    },
  });

  const grievanceSeeds = Array.from({ length: 180 }, (_, index) => {
    const critical = index % 9 === 0;
    const food = index % 5 === 0;
    const wifi = index % 3 === 0;
    const category = critical
      ? 'Safety/Ragging'
      : food
        ? 'Food'
        : wifi
          ? 'Wi-Fi'
          : 'Infrastructure';
    const severity = critical
      ? GrievanceSeverity.CRITICAL
      : food
        ? GrievanceSeverity.HIGH
        : wifi
          ? GrievanceSeverity.MEDIUM
          : GrievanceSeverity.LOW;

    return {
      category,
      title: `[Mock AI] ${category} issue ${String(index + 1).padStart(3, '0')}`,
      description: critical
        ? 'Student reported unsafe behaviour and possible ragging near hostel area.'
        : food
          ? 'Students reported cold food and hygiene concern in mess serving area.'
          : wifi
            ? 'Internet connectivity is slow during lab and project hours.'
            : 'Classroom maintenance and equipment availability need attention.',
      severity,
      isAnonymous: index % 2 === 0,
      safetyFlag: critical,
      collegeId: college.id,
      reporterId:
        index % 2 === 0 ? undefined : students[index % students.length].id,
    };
  });

  await prisma.grievance.createMany({ data: grievanceSeeds });

  console.log(`Mock AI dataset ready`);
  console.log(`Students: ${students.length}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Feedback responses: ${students.length * questions.length}`);
  console.log(`Mock grievances: ${grievanceSeeds.length}`);
  console.timeEnd('mock-ai-seed');
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
