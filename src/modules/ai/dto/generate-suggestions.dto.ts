import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AnsweredQuestionDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'true = compliant (Yes), false = non-compliant (No)' })
  @IsBoolean()
  compliant: boolean;
}

export class GenerateSuggestionsRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  inspectionTypeCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inspectionTypeName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  facilityName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  visitType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(['WARNING', 'CLOSURE_IMMEDIATE', 'CLOSURE_DEADLINE', 'PROSECUTION_RECOMMENDED', 'NO_ACTION'])
  decision?: string;

  @ApiProperty({ type: [AnsweredQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnsweredQuestionDto)
  answers: AnsweredQuestionDto[];
}

export class AiSuggestionsResponseDto {
  @ApiProperty()
  comments: string;

  @ApiProperty()
  recommendations: string;

  @ApiProperty({ type: [String] })
  quickComments: string[];

  @ApiProperty({ type: [String] })
  quickRecommendations: string[];
}
