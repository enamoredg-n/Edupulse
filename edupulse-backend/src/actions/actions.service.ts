import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list(collegeId: string, reportId?: string) {
    return this.prisma.actionItem.findMany({
      where: reportId ? { collegeId, reportId } : { collegeId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(adminId: string, collegeId: string, dto: CreateActionItemDto) {
    const report = await this.prisma.analysisReport.findFirst({
      where: { id: dto.reportId, collegeId },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found for this college');
    }

    const action = await this.prisma.actionItem.create({
      data: { ...dto, collegeId },
    });

    await this.auditService.log({
      action: AuditAction.ACTION_ITEM_CREATED,
      actorId: adminId,
      collegeId,
      entity: 'ActionItem',
      entityId: action.id,
      metadata: {
        reportId: action.reportId,
        priority: action.priority,
        title: action.title,
      },
    });

    return action;
  }

  async updateStatus(
    adminId: string,
    collegeId: string,
    id: string,
    dto: UpdateActionStatusDto,
  ) {
    const action = await this.prisma.actionItem.findFirst({
      where: { id, collegeId },
    });

    if (!action) {
      throw new NotFoundException('Action item not found');
    }

    const updated = await this.prisma.actionItem.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.auditService.log({
      action: AuditAction.ACTION_STATUS_UPDATED,
      actorId: adminId,
      collegeId,
      entity: 'ActionItem',
      entityId: updated.id,
      metadata: {
        status: updated.status,
        title: updated.title,
      },
    });

    return updated;
  }
}
