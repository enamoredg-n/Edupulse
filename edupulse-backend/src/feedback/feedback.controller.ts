import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeedbackService } from './feedback.service';
import { AdminFeedbackFormDto } from './dto/admin-feedback-form.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@ApiTags('feedback')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get('categories')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  getCategories(@Req() request: AuthenticatedRequest) {
    return this.feedbackService.getCategories(request.user!.collegeId);
  }

  @Get('active-term')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  getActiveTerm(@Req() request: AuthenticatedRequest) {
    return this.feedbackService.getActiveTerm(request.user!.collegeId);
  }

  @Get('admin/terms')
  @Roles(UserRole.ADMIN)
  getAdminTerms(@Req() request: AuthenticatedRequest) {
    return this.feedbackService.getAdminTerms(request.user!.collegeId);
  }

  @Post('submit')
  @Roles(UserRole.STUDENT)
  submit(@Req() request: AuthenticatedRequest, @Body() dto: SubmitFeedbackDto) {
    return this.feedbackService.submit(
      request.user!.sub,
      request.user!.collegeId,
      dto,
    );
  }

  @Post('admin/form')
  @Roles(UserRole.ADMIN)
  createOrPublishForm(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AdminFeedbackFormDto,
  ) {
    return this.feedbackService.createOrPublishForm(
      request.user!.sub,
      request.user!.collegeId,
      dto,
    );
  }

  @Post('admin/turn-off')
  @Roles(UserRole.ADMIN)
  turnOffFeedback(@Req() request: AuthenticatedRequest) {
    return this.feedbackService.turnOffFeedback(
      request.user!.sub,
      request.user!.collegeId,
    );
  }
}
