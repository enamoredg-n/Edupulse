import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RunAnalysisDto {
  @ApiProperty()
  @IsString()
  termId: string;
}
