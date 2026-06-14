import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PriorityLevel } from '@prisma/client';

export class CreateActionItemDto {
  @ApiProperty()
  @IsString()
  reportId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ enum: PriorityLevel })
  @IsEnum(PriorityLevel)
  priority: PriorityLevel;

  @ApiProperty()
  @IsString()
  timeline: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  kpi?: string;
}
