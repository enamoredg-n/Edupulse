import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(collegeId: string, termId?: string) {
    const activeTerm =
      termId === undefined
        ? await this.prisma.academicTerm.findFirst({
            where: { collegeId, isActive: true },
            orderBy: { createdAt: 'desc' },
          })
        : null;
    const selectedTermId = termId ?? activeTerm?.id;
    const selectedTerm = selectedTermId
      ? await this.prisma.academicTerm.findFirst({
          where: { id: selectedTermId, collegeId },
        })
      : null;
    const previousTerm = selectedTerm
      ? await this.prisma.academicTerm.findFirst({
          where: {
            collegeId,
            id: { not: selectedTerm.id },
            OR: selectedTerm.startsAt
              ? [
                  { endsAt: { lt: selectedTerm.startsAt } },
                  { createdAt: { lt: selectedTerm.createdAt } },
                ]
              : [{ createdAt: { lt: selectedTerm.createdAt } }],
          },
          orderBy: [{ endsAt: 'desc' }, { createdAt: 'desc' }],
        })
      : null;
    const feedbackWhere = selectedTermId
      ? { collegeId, submission: { termId: selectedTermId } }
      : { collegeId };
    const previousFeedbackWhere = previousTerm
      ? { collegeId, submission: { termId: previousTerm.id } }
      : undefined;

    const [
      responseCount,
      submissionCount,
      categoryGroups,
      previousCategoryGroups,
      ratingGroups,
      categoryRatingGroups,
      latestReport,
      actionGroups,
    ] = await Promise.all([
      this.prisma.feedbackResponse.count({ where: feedbackWhere }),
      this.prisma.feedbackSubmission.count({
        where: selectedTermId
          ? { collegeId, termId: selectedTermId }
          : { collegeId },
      }),
      this.prisma.feedbackResponse.groupBy({
        by: ['categoryId'],
        where: feedbackWhere,
        _avg: { rating: true },
        _count: { id: true },
      }),
      previousFeedbackWhere
        ? this.prisma.feedbackResponse.groupBy({
            by: ['categoryId'],
            where: previousFeedbackWhere,
            _avg: { rating: true },
            _count: { id: true },
          })
        : Promise.resolve([]),
      this.prisma.feedbackResponse.groupBy({
        by: ['rating'],
        where: feedbackWhere,
        _count: { id: true },
      }),
      this.prisma.feedbackResponse.groupBy({
        by: ['categoryId', 'rating'],
        where: feedbackWhere,
        _count: { id: true },
      }),
      this.prisma.analysisReport.findFirst({
        where: selectedTermId
          ? { collegeId, termId: selectedTermId }
          : { collegeId },
        orderBy: { createdAt: 'desc' },
        include: {
          themes: {
            orderBy: [{ priority: 'desc' }, { mentionCount: 'desc' }],
            take: 5,
          },
          actions: {
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            take: 5,
          },
        },
      }),
      this.prisma.actionItem.groupBy({
        by: ['status'],
        where: { collegeId },
        _count: { id: true },
      }),
    ]);

    const categories = await this.prisma.feedbackCategory.findMany({
      where: {
        collegeId,
        id: { in: categoryGroups.map((group) => group.categoryId) },
      },
      select: { id: true, name: true },
    });
    const categoryNameById = new Map(
      categories.map((category) => [category.id, category.name]),
    );
    const departmentCategoryRows = selectedTermId
      ? await this.prisma.$queryRaw<DepartmentCategoryRow[]>`
          SELECT
            d."code" AS "departmentCode",
            r."categoryId" AS "categoryId",
            AVG(r."rating")::float8 AS "averageRating",
            COUNT(*)::int AS "responseCount"
          FROM "FeedbackResponse" r
          JOIN "FeedbackSubmission" s ON s."id" = r."submissionId"
          JOIN "User" u ON u."id" = s."studentId"
          LEFT JOIN "Department" d ON d."id" = u."departmentId"
          WHERE r."collegeId" = ${collegeId} AND s."termId" = ${selectedTermId}
          GROUP BY d."code", r."categoryId"
        `
      : await this.prisma.$queryRaw<DepartmentCategoryRow[]>`
          SELECT
            d."code" AS "departmentCode",
            r."categoryId" AS "categoryId",
            AVG(r."rating")::float8 AS "averageRating",
            COUNT(*)::int AS "responseCount"
          FROM "FeedbackResponse" r
          JOIN "FeedbackSubmission" s ON s."id" = r."submissionId"
          JOIN "User" u ON u."id" = s."studentId"
          LEFT JOIN "Department" d ON d."id" = u."departmentId"
          WHERE r."collegeId" = ${collegeId}
          GROUP BY d."code", r."categoryId"
        `;
    const departmentsMonitored = new Set(
      departmentCategoryRows
        .map((item) => item.departmentCode)
        .filter((code): code is string => Boolean(code)),
    ).size;

    return {
      termId: selectedTermId,
      responseCount,
      submissionCount,
      departmentsMonitored,
      departmentCategorySatisfaction: departmentCategoryRows.map((row) => ({
        departmentCode: row.departmentCode ?? 'UNKNOWN',
        categoryId: row.categoryId,
        categoryName: categoryNameById.get(row.categoryId) ?? 'Unknown',
        averageRating: Number(Number(row.averageRating).toFixed(2)),
        responseCount: Number(row.responseCount),
      })),
      categorySatisfaction: categoryGroups.map((group) => ({
        categoryId: group.categoryId,
        categoryName: categoryNameById.get(group.categoryId) ?? 'Unknown',
        averageRating: Number((group._avg.rating ?? 0).toFixed(2)),
        responseCount: group._count.id,
      })),
      previousTerm: previousTerm
        ? {
            id: previousTerm.id,
            name: previousTerm.name,
          }
        : null,
      previousCategorySatisfaction: previousCategoryGroups.map((group) => ({
        categoryId: group.categoryId,
        categoryName: categoryNameById.get(group.categoryId) ?? 'Unknown',
        averageRating: Number((group._avg.rating ?? 0).toFixed(2)),
        responseCount: group._count.id,
      })),
      ratingDistribution: this.toRatingDistribution(ratingGroups),
      categoryRatingDistribution: categoryGroups.map((group) => ({
        categoryId: group.categoryId,
        categoryName: categoryNameById.get(group.categoryId) ?? 'Unknown',
        distribution: this.toRatingDistribution(
          categoryRatingGroups.filter((item) => item.categoryId === group.categoryId),
        ),
      })),
      actionByStatus: actionGroups.map((group) => ({
        status: group.status,
        count: group._count.id,
      })),
      latestReport,
    };
  }

  private toRatingDistribution(
    groups: { rating: number; _count: { id: number } }[],
  ) {
    const unsatisfied = groups
      .filter((group) => group.rating <= 2)
      .reduce((total, group) => total + group._count.id, 0);
    const average = groups
      .filter((group) => group.rating === 3)
      .reduce((total, group) => total + group._count.id, 0);
    const satisfied = groups
      .filter((group) => group.rating >= 4)
      .reduce((total, group) => total + group._count.id, 0);

    return { unsatisfied, average, satisfied };
  }
}

type DepartmentCategoryRow = {
  departmentCode: string | null;
  categoryId: string;
  averageRating: number;
  responseCount: number;
};
