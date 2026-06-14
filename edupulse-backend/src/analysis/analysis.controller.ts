import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalysisService } from './analysis.service';
import { RunAnalysisDto } from './dto/run-analysis.dto';

@ApiTags('analysis')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('run')
  @Roles(UserRole.ADMIN)
  run(@Req() request: AuthenticatedRequest, @Body() dto: RunAnalysisDto) {
    return this.analysisService.run(
      request.user!.sub,
      request.user!.collegeId,
      dto,
    );
  }

  @Post('validation-demo')
  @Roles(UserRole.ADMIN)
  validationDemo(@Req() request: AuthenticatedRequest) {
    return this.analysisService.validationDemo(request.user!.collegeId);
  }
}
