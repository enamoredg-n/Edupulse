import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  listReports(
    @Req() request: AuthenticatedRequest,
    @Query('termId') termId?: string,
  ) {
    return this.reportsService.listReports(request.user!.collegeId, termId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  getReport(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.reportsService.getReport(
      request.user!.collegeId,
      id,
      request.user!.sub,
    );
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @Roles(UserRole.ADMIN)
  async downloadPdf(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const pdf = await this.reportsService.createPdf(
      request.user!.collegeId,
      id,
      request.user!.sub,
    );
    return new StreamableFile(pdf, {
      disposition: `attachment; filename="edupulse-report-${id}.pdf"`,
    });
  }
}
