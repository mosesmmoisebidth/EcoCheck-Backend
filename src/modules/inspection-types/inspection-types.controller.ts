import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { InspectionTypesService } from './inspection-types.service';
import { InspectionTypeResponseDto } from './dto/inspection-type-response.dto';
import { InspectionTypeEntity } from './entities/inspection-type.entity';

@ApiTags('inspection-types')
@Controller('inspection-types')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InspectionTypesController {
  constructor(private readonly inspectionTypesService: InspectionTypesService) {}

  @Get()
  async findAll(
    @Req() request: Request,
  ): Promise<ResponseDto<InspectionTypeResponseDto[]>> {
    const responseService = new ResponseService(request);
    const types = await this.inspectionTypesService.findAll();
    return responseService.makeResponse({
      message: 'Inspection types loaded',
      payload: types.map((type) => this.toResponse(type)),
      responseType: EResponse.SUCCESS,
    });
  }

  private toResponse(
    type: InspectionTypeEntity,
  ): InspectionTypeResponseDto {
    return {
      id: type.id,
      code: type.code,
      name: type.name,
      active: type.active,
    };
  }
}
