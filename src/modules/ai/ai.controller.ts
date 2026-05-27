import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { ResponseService } from 'src/shared/response/response.service';
import { AiService } from './ai.service';
import {
  AiSuggestionsResponseDto,
  GenerateSuggestionsRequestDto,
} from './dto/generate-suggestions.dto';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('inspection-suggestions')
  async generate(
    @Req() request: Request,
    @Body() dto: GenerateSuggestionsRequestDto,
  ): Promise<ResponseDto<AiSuggestionsResponseDto>> {
    const responseService = new ResponseService(request);
    const payload = await this.aiService.generateSuggestions(dto);
    return responseService.makeResponse({
      message: 'AI suggestions generated',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }
}
