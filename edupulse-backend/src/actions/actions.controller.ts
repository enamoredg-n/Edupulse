import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActionsService } from './actions.service';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';

@ApiTags('actions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  list(
    @Req() request: AuthenticatedRequest,
    @Query('reportId') reportId?: string,
  ) {
    return this.actionsService.list(request.user!.collegeId, reportId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateActionItemDto,
  ) {
    return this.actionsService.create(
      request.user!.sub,
      request.user!.collegeId,
      dto,
    );
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateActionStatusDto,
  ) {
    return this.actionsService.updateStatus(
      request.user!.sub,
      request.user!.collegeId,
      id,
      dto,
    );
  }
}
