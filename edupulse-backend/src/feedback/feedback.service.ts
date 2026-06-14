import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, FeedbackSubmissionStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminFeedbackFormDto } from './dto/admin-feedback-form.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  getCategories(collegeId: string) {
    return this.prisma.feedbackCategory.findMany({
      where: { collegeId, questions: { some: { isActive: true } } },
      include: { questions: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    });
  }

  getActiveTerm(collegeId: string) {
    return this.prisma.academicTerm.findFirst({
      where: { collegeId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getAdminTerms(collegeId: string) {
    return this.prisma.academicTerm.findMany({
      where: { collegeId },
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
      },
    });
  }

  async submit(studentId: string, collegeId: string, dto: SubmitFeedbackDto) {
    const submission = await this.prisma.$transaction(async (tx) => {
      const term = await tx.academicTerm.findFirst({
        where: { id: dto.termId, collegeId, isActive: true },
        select: { id: true },
      });

      if (!term) {
        throw new BadRequestException('Active feedback term not found');
      }

      const student = await tx.user.findFirst({
        where: { id: studentId, collegeId },
        select: { id: true },
      });

      if (!student) {
        throw new BadRequestException(
          'Student does not belong to this college',
        );
      }

      const questionIds = dto.answers.map((answer) => answer.questionId);
      const validQuestionCount = await tx.feedbackQuestion.count({
        where: { id: { in: questionIds }, collegeId, isActive: true },
      });

      if (validQuestionCount !== new Set(questionIds).size) {
        throw new BadRequestException('Feedback contains invalid question(s)');
      }

      const existingSubmission = await tx.feedbackSubmission.findUnique({
        where: { studentId_termId: { studentId, termId: dto.termId } },
      });

      if (existingSubmission) {
        await tx.feedbackResponse.deleteMany({
          where: { submissionId: existingSubmission.id },
        });

        return tx.feedbackSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            status: FeedbackSubmissionStatus.SUBMITTED,
            responses: {
              create: dto.answers.map((answer) => ({
                collegeId,
                questionId: answer.questionId,
                categoryId: answer.categoryId,
                rating: answer.rating,
                comment: answer.comment,
              })),
            },
          },
          include: { responses: true },
        });
      }

      return tx.feedbackSubmission.create({
        data: {
          collegeId,
          studentId,
          termId: dto.termId,
          responses: {
            create: dto.answers.map((answer) => ({
              collegeId,
              questionId: answer.questionId,
              categoryId: answer.categoryId,
              rating: answer.rating,
              comment: answer.comment,
            })),
          },
        },
        include: { responses: true },
      });
    });

    await this.auditService.log({
      action: AuditAction.FEEDBACK_SUBMITTED,
      actorId: studentId,
      collegeId,
      entity: 'FeedbackSubmission',
      entityId: submission.id,
      metadata: {
        termId: dto.termId,
        answerCount: dto.answers.length,
      },
    });

    return submission;
  }

  async createOrPublishForm(
    adminId: string,
    collegeId: string,
    dto: AdminFeedbackFormDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.academicTerm.updateMany({
        where: { collegeId },
        data: { isActive: false },
      });
      await tx.feedbackQuestion.updateMany({
        where: { collegeId },
        data: { isActive: false },
      });

      const term = await tx.academicTerm.upsert({
        where: { collegeId_name: { collegeId, name: dto.termName } },
        update: { isActive: true },
        create: {
          collegeId,
          name: dto.termName,
          startsAt: new Date(),
          isActive: true,
        },
      });

      for (const categoryInput of dto.categories) {
        const category = await tx.feedbackCategory.upsert({
          where: {
            collegeId_name: { collegeId, name: categoryInput.name },
          },
          update: { description: categoryInput.description },
          create: {
            collegeId,
            name: categoryInput.name,
            description: categoryInput.description,
          },
        });

        for (const text of categoryInput.questions) {
          const trimmedText = text.trim();
          if (!trimmedText) continue;

          const existingQuestion = await tx.feedbackQuestion.findFirst({
            where: { collegeId, categoryId: category.id, text: trimmedText },
          });

          if (existingQuestion) {
            await tx.feedbackQuestion.update({
              where: { id: existingQuestion.id },
              data: { isActive: true },
            });
          } else {
            await tx.feedbackQuestion.create({
              data: {
                collegeId,
                categoryId: category.id,
                text: trimmedText,
                isActive: true,
              },
            });
          }
        }
      }

      return {
        term,
        categories: await tx.feedbackCategory.findMany({
          where: { collegeId, questions: { some: { isActive: true } } },
          include: { questions: { where: { isActive: true } } },
          orderBy: { name: 'asc' },
        }),
      };
    });

    await this.auditService.log({
      action: AuditAction.FEEDBACK_FORM_PUBLISHED,
      actorId: adminId,
      collegeId,
      entity: 'AcademicTerm',
      entityId: result.term.id,
      metadata: {
        termName: result.term.name,
        categoryCount: result.categories.length,
        questionCount: result.categories.reduce(
          (count, category) => count + category.questions.length,
          0,
        ),
      },
    });

    return result;
  }

  async turnOffFeedback(adminId: string, collegeId: string) {
    const updated = await this.prisma.academicTerm.updateMany({
      where: { collegeId },
      data: { isActive: false },
    });

    await this.auditService.log({
      action: AuditAction.FEEDBACK_FORM_TURNED_OFF,
      actorId: adminId,
      collegeId,
      entity: 'AcademicTerm',
      metadata: {
        disabledTerms: updated.count,
      },
    });

    return {
      status: 'OFF',
      message: 'Semester feedback is turned off for students.',
    };
  }
}
