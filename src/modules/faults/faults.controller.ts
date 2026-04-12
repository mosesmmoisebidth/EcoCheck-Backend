import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { FaultsService } from './faults.service';
import { FaultResponseDto } from './dto/fault-response.dto';
import { UpdateFaultDto } from './dto/update-fault.dto';
import { CreateFaultsBulkDto } from './dto/create-faults-bulk.dto';
import { FaultEntity } from './entities/fault.entity';

@ApiTags('faults')
@Controller('faults')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FaultsController {
  constructor(private readonly faultsService: FaultsService) {}

  @Get()
  async findAll(
    @Req() request: Request,
    @Query('inspectionTypeId') inspectionTypeId?: string,
    @Query('active') active?: string,
  ): Promise<ResponseDto<FaultResponseDto[]>> {
    const responseService = new ResponseService(request);
    const faults = await this.faultsService.findAll(
      inspectionTypeId,
      active ? active === 'true' : undefined,
    );
    return responseService.makeResponse({
      message: 'Faults loaded',
      payload: faults.map((fault) => this.toResponse(fault)),
      responseType: EResponse.SUCCESS,
    });
  }

  @Put(':id')
  @Roles(UserRole.DISTRICT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateFaultDto,
  ): Promise<ResponseDto<FaultResponseDto>> {
    const responseService = new ResponseService(request);
    const fault = await this.faultsService.update(id, dto);
    return responseService.makeResponse({
      message: 'Fault updated',
      payload: this.toResponse(fault),
      responseType: EResponse.SUCCESS,
    });
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createBulk(
    @Req() request: Request,
    @Body() dto: CreateFaultsBulkDto,
  ): Promise<
    ResponseDto<{ created: FaultResponseDto[]; skipped: string[]; total: number }>
  > {
    const responseService = new ResponseService(request);
    const result = await this.faultsService.createBulk(dto);
    return responseService.makeResponse({
      message: 'Questionnaire uploaded',
      payload: {
        created: result.created.map((fault) => this.toResponse(fault)),
        skipped: result.skipped,
        total: result.total,
      },
      responseType: EResponse.SUCCESS,
    });
  }

  private toResponse(fault: FaultEntity): FaultResponseDto {
    return {
      id: fault.id,
      inspectionTypeId: fault.inspectionType?.id ?? '',
      name: fault.name,
      standardFine: fault.standardFine,
      active: fault.active,
    };
  }
}
