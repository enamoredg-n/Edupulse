import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';

@Module({
  imports: [AuditModule],
  controllers: [ActionsController],
  providers: [ActionsService],
})
export class ActionsModule {}
