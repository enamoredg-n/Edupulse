import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditInput = {
  action: AuditAction;
  actorId?: string | null;
  collegeId: string;
  entity?: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          action: input.action,
          actorId: input.actorId ?? undefined,
          collegeId: input.collegeId,
          entity: input.entity,
          entityId: input.entityId ?? undefined,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Audit log failed for ${input.action}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  async listByCollege(collegeId: string, limit = 80) {
    const safeLimit = Math.min(Math.max(Math.floor(limit) || 80, 1), 200);

    return this.prisma.auditLog.findMany({
      where: { collegeId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        college: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }
}
