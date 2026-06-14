import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AiAnalysisClient } from './ai-analysis-client.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [AuditModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, AiAnalysisClient],
})
export class AnalysisModule {}
