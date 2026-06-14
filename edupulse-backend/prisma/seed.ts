import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  FeedbackCategory,
  GrievanceSeverity,
  PrismaClient,
  User,
  UserRole,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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
  const glBajaj = await prisma.college.upsert({
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

  const sharda = await prisma.college.upsert({
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

  const cse = await prisma.department.upsert({
    where: { collegeId_code: { collegeId: glBajaj.id, code: 'CSE' } },
    update: {},
    create: {
      collegeId: glBajaj.id,
      code: 'CSE',
      name: 'Computer Science Engineering',
    },
  });

  const shardaCse = await prisma.department.upsert({
    where: { collegeId_code: { collegeId: sharda.id, code: 'CSE' } },
    update: {},
    create: {
      collegeId: sharda.id,
      code: 'CSE',
      name: 'Computer Science Engineering',
    },
  });

  const term = await prisma.academicTerm.upsert({
    where: {
      collegeId_name: {
        collegeId: glBajaj.id,
        name: 'Semester Feedback 2026',
      },
    },
    update: { isActive: true },
    create: {
      collegeId: glBajaj.id,
      name: 'Semester Feedback 2026',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-06-30T23:59:59.000Z'),
      isActive: true,
    },
  });

  const savedCategories: FeedbackCategory[] = [];

  for (const category of feedbackBlueprint) {
    const savedCategory = await prisma.feedbackCategory.upsert({
      where: {
        collegeId_name: { collegeId: glBajaj.id, name: category.name },
      },
      update: { description: category.description },
      create: {
        collegeId: glBajaj.id,
        name: category.name,
        description: category.description,
      },
    });

    await seedQuestions(glBajaj.id, savedCategory.id, category.questions);
    savedCategories.push(savedCategory);
  }

  await prisma.user.upsert({
    where: { email: 'admin@edupulse.edu' },
    update: {
      name: 'EduPulse Admin',
      passwordHash: await hash('Admin@12345', 10),
      role: UserRole.ADMIN,
      collegeId: glBajaj.id,
    },
    create: {
      collegeId: glBajaj.id,
      name: 'EduPulse Admin',
      email: 'admin@edupulse.edu',
      passwordHash: await hash('Admin@12345', 10),
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@sharda.edu' },
    update: {
      name: 'Sharda Admin',
      passwordHash: await hash('Admin@12345', 10),
      role: UserRole.ADMIN,
      collegeId: sharda.id,
    },
    create: {
      collegeId: sharda.id,
      name: 'Sharda Admin',
      email: 'admin@sharda.edu',
      passwordHash: await hash('Admin@12345', 10),
      role: UserRole.ADMIN,
    },
  });

  const demoStudents = [
    {
      name: 'Demo Student',
      email: 'student@edupulse.edu',
      password: 'Student@12345',
      semesterNumber: 6,
    },
    {
      name: 'Aarav Sharma',
      email: 'aarav@edupulse.edu',
      password: 'Student@12345',
      semesterNumber: 6,
    },
    {
      name: 'Meera Patel',
      email: 'meera@edupulse.edu',
      password: 'Student@12345',
      semesterNumber: 6,
    },
    {
      name: 'Kabir Singh',
      email: 'kabir@edupulse.edu',
      password: 'Student@12345',
      semesterNumber: 4,
    },
    {
      name: 'Nisha Verma',
      email: 'nisha@edupulse.edu',
      password: 'Student@12345',
      semesterNumber: 4,
    },
  ];

  const savedStudents: User[] = [];

  for (const student of demoStudents) {
    const savedStudent = await prisma.user.upsert({
      where: { email: student.email },
      update: {
        name: student.name,
        passwordHash: await hash(student.password, 10),
        role: UserRole.STUDENT,
        collegeId: glBajaj.id,
        departmentId: cse.id,
        semesterNumber: student.semesterNumber,
      },
      create: {
        collegeId: glBajaj.id,
        name: student.name,
        email: student.email,
        passwordHash: await hash(student.password, 10),
        role: UserRole.STUDENT,
        departmentId: cse.id,
        semesterNumber: student.semesterNumber,
      },
    });

    savedStudents.push(savedStudent);
  }

  const allQuestions = await prisma.feedbackQuestion.findMany({
    where: {
      collegeId: glBajaj.id,
      categoryId: { in: savedCategories.map((category) => category.id) },
    },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  const commentsByCategory: Record<string, string[]> = {
    Academics: [
      'Syllabus is useful but exam load feels high.',
      'Assignments are good but deadlines overlap.',
      'Course plan is clear and helpful.',
    ],
    Faculty: [
      'Some faculty explain very clearly.',
      'Doubt solving should be faster after class.',
      'More practical examples are needed.',
    ],
    Infrastructure: [
      'Lab systems are slow and Wi-Fi is not working properly.',
      'Projector and classroom maintenance need improvement.',
      'Labs are useful but equipment availability is limited.',
    ],
    'Food & Mess': [
      'Food quality is inconsistent and hygiene needs attention.',
      'Mess food is sometimes cold and repetitive.',
      'Canteen options are decent but hygiene can improve.',
    ],
    'Sports & Campus': [
      'Sports facilities are good but timings are limited.',
      'More extracurricular events should be planned.',
      'Campus experience is positive overall.',
    ],
  };

  for (const [studentIndex, student] of savedStudents.entries()) {
    const submission = await prisma.feedbackSubmission.upsert({
      where: { studentId_termId: { studentId: student.id, termId: term.id } },
      update: {},
      create: {
        collegeId: glBajaj.id,
        studentId: student.id,
        termId: term.id,
      },
    });

    await prisma.feedbackResponse.deleteMany({
      where: { submissionId: submission.id },
    });

    await prisma.feedbackResponse.createMany({
      data: allQuestions.map((question, questionIndex) => {
        const categoryName = question.category.name;
        const baseRating =
          categoryName === 'Infrastructure' || categoryName === 'Food & Mess'
            ? 2
            : 3;
        const rating = Math.max(
          1,
          Math.min(
            4,
            baseRating + ((studentIndex + questionIndex) % 3 === 0 ? -1 : 1),
          ),
        );
        const comments = commentsByCategory[categoryName] ?? [];

        return {
          submissionId: submission.id,
          collegeId: glBajaj.id,
          categoryId: question.categoryId,
          questionId: question.id,
          rating,
          comment:
            rating <= 2 ? comments[studentIndex % comments.length] : undefined,
        };
      }),
    });
  }

  const grievanceSeeds = [
    {
      category: 'Safety/Ragging',
      title: 'Unsafe comments near hostel block',
      description:
        'A group of students reported repeated intimidating comments near the hostel block in the evening.',
      severity: GrievanceSeverity.CRITICAL,
      isAnonymous: true,
    },
    {
      category: 'Wi-Fi',
      title: 'Wi-Fi not working in lab area',
      description:
        'Internet is slow in the lab area during project hours and affects practical work.',
      severity: GrievanceSeverity.MEDIUM,
      isAnonymous: false,
    },
  ];

  for (const grievance of grievanceSeeds) {
    const existing = await prisma.grievance.findFirst({
      where: { title: grievance.title },
    });

    if (!existing) {
      await prisma.grievance.create({
        data: {
          ...grievance,
          collegeId: glBajaj.id,
          reporterId: grievance.isAnonymous ? undefined : savedStudents[0].id,
          safetyFlag: grievance.severity === GrievanceSeverity.CRITICAL,
        },
      });
    }
  }

  await prisma.user.upsert({
    where: { email: 'student@sharda.edu' },
    update: {
      name: 'Sharda Demo Student',
      passwordHash: await hash('Student@12345', 10),
      role: UserRole.STUDENT,
      collegeId: sharda.id,
      departmentId: shardaCse.id,
      semesterNumber: 6,
    },
    create: {
      collegeId: sharda.id,
      name: 'Sharda Demo Student',
      email: 'student@sharda.edu',
      passwordHash: await hash('Student@12345', 10),
      role: UserRole.STUDENT,
      departmentId: shardaCse.id,
      semesterNumber: 6,
    },
  });
}

main()
  .then(async () => {
    console.log('Seed data created successfully');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
