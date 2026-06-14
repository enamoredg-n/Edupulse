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
  throw new Error('DATABASE_URL is required to seed test_dataset2_edge_cases');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TERM_NAME = 'test_dataset2_edge_cases';
const STUDENT_COUNT = 100;
const PASSWORD = 'Student@12345';

type CategoryStrength = 'HIGH' | 'MEDIUM' | 'WEAK';

const departments = [
  { code: 'CSE', name: 'Computer Science Engineering' },
  { code: 'ECE', name: 'Electronics and Communication' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
];

const categories: Array<{
  description: string;
  name: string;
  question: string;
  strength: CategoryStrength;
}> = [
  {
    name: 'Academics',
    description: 'Assignments, academic planning, exams and study support.',
    question: 'How satisfied are you with academics this semester?',
    strength: 'HIGH',
  },
  {
    name: 'Faculty',
    description: 'Teaching quality, behaviour, fairness and subject knowledge.',
    question: 'How satisfied are you with faculty this semester?',
    strength: 'WEAK',
  },
  {
    name: 'Mess',
    description: 'Mess food, hygiene, water and serving quality.',
    question: 'How satisfied are you with mess services this semester?',
    strength: 'WEAK',
  },
  {
    name: 'Canteen',
    description: 'Canteen queue, hygiene, food options and crowd handling.',
    question: 'How satisfied are you with canteen services this semester?',
    strength: 'MEDIUM',
  },
  {
    name: 'Safety',
    description: 'Ragging, harassment, violence, emergency and campus safety.',
    question: 'How satisfied are you with campus safety this semester?',
    strength: 'WEAK',
  },
  {
    name: 'Placements',
    description: 'Placement drives, eligibility, training and communication.',
    question: 'How satisfied are you with placements this semester?',
    strength: 'WEAK',
  },
  {
    name: 'Extracurricular',
    description: 'Fests, clubs, events and participation opportunities.',
    question: 'How satisfied are you with extracurricular activities this semester?',
    strength: 'MEDIUM',
  },
  {
    name: 'Sports',
    description: 'Sports equipment, ground access and practice support.',
    question: 'How satisfied are you with sports facilities this semester?',
    strength: 'MEDIUM',
  },
  {
    name: 'Infrastructure',
    description: 'Classrooms, projectors, fans, buildings and maintenance.',
    question: 'How satisfied are you with infrastructure this semester?',
    strength: 'WEAK',
  },
  {
    name: 'Hostel',
    description: 'Hostel rooms, hygiene, water, Wi-Fi and maintenance.',
    question: 'How satisfied are you with hostel facilities this semester?',
    strength: 'WEAK',
  },
  {
    name: 'Library',
    description: 'Library seating, AC, books and reading-room access.',
    question: 'How satisfied are you with library facilities this semester?',
    strength: 'HIGH',
  },
  {
    name: 'Labs',
    description: 'Lab equipment, safety, systems and practical support.',
    question: 'How satisfied are you with lab facilities this semester?',
    strength: 'WEAK',
  },
  {
    name: 'Wi-Fi / Internet',
    description: 'Internet speed, hostel Wi-Fi, campus Wi-Fi and reliability.',
    question: 'How satisfied are you with Wi-Fi and internet this semester?',
    strength: 'WEAK',
  },
  {
    name: 'Transport',
    description: 'Bus timing, routes, crowding and pickup reliability.',
    question: 'How satisfied are you with transport services this semester?',
    strength: 'HIGH',
  },
  {
    name: 'Administration',
    description: 'Fee counter, certificates, office response and documentation.',
    question: 'How satisfied are you with administration services this semester?',
    strength: 'MEDIUM',
  },
];

const commentsByCategory: Record<string, string[]> = {
  Academics: [
    'Assignments are uploaded late and students get less time to prepare.',
    'Internal exam dates are announced late and it creates pressure before submissions.',
    'ajhdvbs',
    'good good good good good',
    'movie pizza weather phone battery',
    'ok',
  ],
  Faculty: [
    'Faculty behaviour is rude when students ask doubts in class.',
    'Some faculty members talk harshly to students during doubt sessions.',
    'Faculty sometimes insult students instead of explaining mistakes.',
    'Faculty ignores doubts and students feel discouraged.',
    'Faculty communication is not respectful during practical discussion.',
    'Faculty lacks subject knowledge and cannot explain important concepts clearly.',
    'Some faculty members lack subject knowledge during advanced topics.',
    'Subject knowledge gaps are affecting exam preparation.',
    'Faculty needs stronger subject knowledge for practical and theory classes.',
    'Lectures become confusing because faculty cannot explain the subject properly.',
    'ECE students reported partiality in practical marks by faculty.',
    'Students feel practical marks are not given fairly and partiality is visible.',
    'Practical marks partiality is reducing trust in the evaluation process.',
    'A student specifically reported harassment by Raghav sir, CS AI faculty, and asked for confidential review.',
    'Students need new faculty for difficult technical subjects.',
    'Please assign new faculty because current teaching is not helping students.',
    'Students requested new faculty for better subject explanation.',
    'Need new faculty for this subject because doubts are not solved properly.',
    'good good good good good',
    'ajhdvbs qwerty zxcasd',
  ],
  Mess: [
    'Insects were found near mess food counter during dinner.',
    'Mess food has insects and the hygiene inspection is needed.',
    'Food is sometimes cold and repetitive in the hostel mess.',
    'Mess serving area is not clean during peak dinner time.',
    'Uncooked food was served twice this week in the mess.',
    'Students reported water contamination in the hostel cooler near mess area.',
    'bad bad bad bad bad',
    'xxxxx',
    'movie pizza weather',
    'trash useless worst terrible',
    'Mess plates are not cleaned properly before serving.',
    'Mess food quality is poor during lunch.',
    'Mess queue is unmanaged and students wait too long.',
    'random random random random random',
  ],
  Canteen: [
    'Canteen queue is too long during lunch break.',
    'Canteen queue takes too much time and students miss class.',
    'Canteen hygiene near serving counter needs improvement.',
    'Canteen food options are not available after 2 PM.',
    'Canteen billing counter is slow during peak time.',
    'ajhdvbs',
    'good good good good good',
    'phone battery low',
    'movie pizza coupon weather',
    'ok',
  ],
  Safety: [
    'Students reported ragging near hostel stairs after evening classes.',
    'Ragging pressure by seniors was reported near the hostel corridor.',
    'A student reported bullying by seniors near the campus exit.',
    'A snake was seen near the playground boundary after evening practice.',
    'Students heard gun firing outside the campus gate and felt unsafe.',
    'A fight with violence was reported near the parking area.',
    'A student reported threat calls after complaining about ragging.',
    'Harassment-like behaviour was reported near the old block corridor.',
    'Campus guards were not present near the hostel gate at night.',
    'Emergency helpline response was slow during a safety concern.',
    'xxxxx',
    'random random random random random',
    'movie pizza weather',
    'trash useless worst terrible',
    'good good good good good',
    'Unsafe movement near the back gate was reported after evening lab.',
    'Street lights near hostel path were not working at night.',
    'Students want better night security near hostels.',
  ],
  Placements: [
    'ECE students were not given a fair chance to sit in CS placement drives despite required skills.',
    'ECE students were blocked from some CS placement drives without clear eligibility explanation.',
    'Placement drive eligibility rules are not clearly communicated to ECE students.',
    'Placement training schedule is shared too late with students.',
    'Mock interview slots are not enough for final-year students.',
    'Placement portal updates are delayed before company visits.',
    'CS placement drives should clearly mention if ECE students are allowed.',
    'ajhdvbs',
    'good good good good good',
    'phone battery low',
    'movie shopping traffic',
    'ok',
    'Training resources for placements are not updated.',
    'Company shortlisting communication is confusing.',
  ],
  Extracurricular: [
    'The college fest was very short and students could not participate properly.',
    'Fest duration was too short and many events were rushed.',
    'Students reported corruption in fest budget handling and said money collection was not transparent.',
    'Extracurricular event notices are shared late.',
    'Fests need better planning and more participation slots.',
    'xxxxx',
    'movie pizza weather',
    'good good good good good',
    'phone battery low',
    'ok',
  ],
  Sports: [
    'Sports items are not available during practice time, including badminton rackets and footballs.',
    'Sports equipment is unavailable when students come for evening practice.',
    'Football and badminton equipment should be issued on time.',
    'Ground booking process is unclear for students.',
    'Sports room is often closed during practice hours.',
    'bad bad bad bad bad',
    'ajhdvbs',
    'movie pizza weather',
    'random random random random random',
    'ok',
  ],
  Infrastructure: [
    'AB2 room 307 projector is broken and classes are affected.',
    'Projector in AB2 room 307 is not working during lectures.',
    'Classroom fan noise is disturbing lectures in Block B.',
    'Ceiling plaster is falling in classroom AB1 room 204 and it can injure students.',
    'Washroom fittings are broken near Block A classrooms.',
    'Classroom benches are damaged in the old academic block.',
    'xxxxx',
    'good good good good good',
    'movie pizza weather',
    'trash useless worst terrible',
    'random random random random random',
    'ok',
  ],
  Hostel: [
    'Hostel rooms need better cleaning and pest control.',
    'Hostel washrooms are not cleaned regularly.',
    'Hostel water cooler tastes contaminated and students are worried.',
    'Hostel maintenance complaints are closed without repair.',
    'Hostel common area fans are not working.',
    'good good good good good',
    'ajhdvbs',
    'phone battery low',
    'movie pizza weather',
    'ok',
    'Hostel laundry timing is not managed properly.',
    'Hostel corridor lights are not working at night.',
  ],
  Library: [
    'Library AC is not working near the reading room.',
    'Library AC issue makes reading room uncomfortable.',
    'Library seats are unavailable during exam week.',
    'Books for new syllabus are limited in the library.',
    'movie pizza weather',
    'good good good good good',
  ],
  Labs: [
    'Electric shock risk was noticed near lab switchboard in electronics lab.',
    'Lab mouse is not working in multiple computer systems.',
    'Lab mouse issue affects practical work in CSE lab.',
    'Some lab equipment is unavailable during practical sessions.',
    'Oscilloscope probes are missing in electronics lab.',
    'Lab systems restart during project work.',
    'ajhdvbs',
    'good good good good good',
    'phone battery low',
    'ok',
  ],
  'Wi-Fi / Internet': [
    ...Array.from(
      { length: 20 },
      () => 'Wi-Fi is slow in hostel during evening study hours.',
    ),
    'ajhdvbs',
    'movie pizza weather phone battery',
  ],
  Transport: [
    'College bus is delayed on the Greater Noida route.',
    'Transport pickup timing is not reliable during morning route.',
    'Bus crowding is high and students have to stand.',
    'good good good good good',
    'phone battery low',
    'ok',
  ],
  Administration: [
    'Fee counter queue is too long during submission week.',
    'Administration certificate process is delayed without clear status.',
    'Office response is slow for document correction requests.',
    'Fee receipt correction takes too many visits.',
    'Administration should give clear timeline for certificates.',
    'movie pizza weather',
    'good good good good good',
    'ajhdvbs',
    'random random random random random',
    'ok',
  ],
};

function studentEmail(index: number) {
  return `edge.test.student.${String(index + 1).padStart(3, '0')}@glbitm.ac.in`;
}

function submissionId(index: number) {
  return `edge_test_submission_${String(index + 1).padStart(3, '0')}`;
}

function ratingFor(strength: CategoryStrength, studentIndex: number) {
  if (strength === 'HIGH') {
    if (studentIndex < 70) return 4;
    if (studentIndex < 90) return 3;
    return 1;
  }
  if (strength === 'MEDIUM') {
    if (studentIndex < 50) return 4;
    if (studentIndex < 80) return 3;
    return 1;
  }
  if (studentIndex < 35) return 4;
  if (studentIndex < 65) return 3;
  return 1;
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function categoryQuestion(
  category: FeedbackCategory,
  questions: FeedbackQuestion[],
) {
  const question = questions.find((item) => item.categoryId === category.id);
  if (!question) {
    throw new Error(`Question missing for ${category.name}`);
  }
  return question;
}

function commentFor(categoryName: string, studentIndex: number) {
  const comments = commentsByCategory[categoryName] ?? [];
  const startIndex = STUDENT_COUNT - comments.length;
  if (studentIndex < startIndex) return null;
  return comments[studentIndex - startIndex] ?? null;
}

async function main() {
  console.time('test-dataset2-edge-cases-seed');
  console.log('Preparing test_dataset2_edge_cases');

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
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
      isActive: true,
    },
    create: {
      collegeId: college.id,
      name: TERM_NAME,
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
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
        where: { email: studentEmail(index) },
        update: {
          departmentId: department.id,
          name: `Edge Test Student ${String(index + 1).padStart(3, '0')}`,
          role: UserRole.STUDENT,
          semesterNumber: 7,
        },
        create: {
          collegeId: college.id,
          departmentId: department.id,
          email: studentEmail(index),
          name: `Edge Test Student ${String(index + 1).padStart(3, '0')}`,
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
    for (const categoryInput of categories) {
      const category = savedCategories.find((item) => item.name === categoryInput.name);
      if (!category) throw new Error(`Category missing: ${categoryInput.name}`);
      const question = categoryQuestion(category, questions);
      responseRows.push({
        collegeId: college.id,
        submissionId: submissionId(studentIndex),
        categoryId: category.id,
        questionId: question.id,
        rating: ratingFor(categoryInput.strength, studentIndex),
        comment: commentFor(category.name, studentIndex),
      });
    }
  }

  await prisma.feedbackResponse.createMany({ data: responseRows });

  const categoryChecks = await prisma.feedbackResponse.groupBy({
    by: ['categoryId', 'rating'],
    where: { collegeId: college.id, submission: { termId: term.id } },
    _count: { id: true },
  });
  console.log('Category rating check');
  for (const category of savedCategories) {
    const rows = categoryChecks.filter((item) => item.categoryId === category.id);
    const satisfied = rows.filter((item) => item.rating >= 4).reduce((sum, item) => sum + item._count.id, 0);
    const average = rows.filter((item) => item.rating === 3).reduce((sum, item) => sum + item._count.id, 0);
    const unsatisfied = rows.filter((item) => item.rating <= 2).reduce((sum, item) => sum + item._count.id, 0);
    console.log(`${category.name}: satisfied=${satisfied}, average=${average}, unsatisfied=${unsatisfied}`);
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
  console.log('test_dataset2_edge_cases ready');
  console.log(`Students/submissions: ${STUDENT_COUNT}`);
  console.log(`Categories: ${savedCategories.length}`);
  console.log(`Feedback responses: ${responseCount}`);
  console.log(`Commented responses: ${commentCount}`);
  console.timeEnd('test-dataset2-edge-cases-seed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
