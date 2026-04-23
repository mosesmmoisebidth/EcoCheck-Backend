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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/types/jwt-payload';
import { UsersService } from 'src/modules/users/users.service';
import {
  CreateInspectionDto,
  InspectionResponseDto,
  UpdateInspectionDto,
} from './dto';
import { InspectionsService } from './inspections.service';
import { InspectionEntity } from './entities/inspection.entity';

@ApiTags('inspections')
@Controller('inspections')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InspectionsController {
  constructor(
    private readonly inspectionsService: InspectionsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @Roles(
    UserRole.HSO,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async findAll(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('facilityId') facilityId?: string,
    @Query('facility_id') facilityIdAlt?: string,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('officer_id') officerId?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<ResponseDto<InspectionResponseDto[]>> {
    const responseService = new ResponseService(request);
    const inspections = await this.inspectionsService.findAll(user, {
      facilityId: facilityId ?? facilityIdAlt,
      district,
      sector,
      officerId,
      visitType,
      decision,
      startDate,
      endDate,
    });
    return responseService.makeResponse({
      message: 'Inspections loaded',
      payload: inspections.map((inspection) => this.toResponse(inspection)),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get(':id')
  @Roles(
    UserRole.HSO,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async findOne(
    @Req() request: Request,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<InspectionResponseDto>> {
    const responseService = new ResponseService(request);
    const inspection = await this.inspectionsService.findOneForUser(id, user);
    return responseService.makeResponse({
      message: 'Inspection loaded',
      payload: this.toResponse(inspection),
      responseType: EResponse.SUCCESS,
    });
  }

  @Post()
  @Roles(
    UserRole.HSO,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async create(
    @Req() request: Request,
    @Body() dto: CreateInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<InspectionResponseDto>> {
    const responseService = new ResponseService(request);
    const entity = await this.usersService.findOne(user.sub);
    const inspection = await this.inspectionsService.create(dto, entity);
    return responseService.makeResponse({
      message: 'Inspection created',
      payload: this.toResponse(inspection),
      responseType: EResponse.SUCCESS,
    });
  }

  @Patch(':id')
  @Roles(
    UserRole.HSO,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<InspectionResponseDto>> {
    const responseService = new ResponseService(request);
    const entity = await this.usersService.findOne(user.sub);
    const inspection = await this.inspectionsService.update(id, dto, entity);
    return responseService.makeResponse({
      message: 'Inspection updated',
      payload: this.toResponse(inspection),
      responseType: EResponse.SUCCESS,
    });
  }

  private toResponse(inspection: InspectionEntity): InspectionResponseDto {
    const facility = inspection.facility;
    const createdBy = inspection.createdBy;
    const faults = inspection.faults ?? [];
    const subtotalFine = faults.reduce(
      (sum, item) => sum + (item.fineAmount ?? 0),
      0,
    );
    return {
      id: inspection.id,
      facilityId: inspection.facility?.id ?? '',
      facilityName: inspection.facilityName,
      visitType: inspection.visitType,
      teamMembers: inspection.teamMembers ?? [],
      inspectionTypeId: inspection.inspectionTypeId ?? undefined,
      faultCount: inspection.faultCount,
      totalFine: inspection.totalFine,
      adjustmentAmount: inspection.adjustmentAmount,
      adjustmentReason: inspection.adjustmentReason,
      decision: inspection.decision,
      comments: inspection.comments,
      recommendations: inspection.recommendations,
      photoPaths: inspection.photoPaths ?? [],
      createdAt: inspection.createdAt.getTime(),
      updatedAt: inspection.updatedAt.getTime(),
      createdBy: inspection.createdBy?.id ?? '',
      createdByName: createdBy?.fullName ?? undefined,
      createdByRole: createdBy?.role ?? undefined,
      createdByEmail: createdBy?.email ?? undefined,
      district: facility?.district ?? undefined,
      sector: facility?.sector ?? undefined,
      facility: facility
        ? {
            id: facility.id,
            name: facility.name,
            tin: facility.tin,
            district: facility.district,
            sector: facility.sector,
            cell: facility.cell,
            village: facility.village,
            latitude: facility.latitude ?? null,
            longitude: facility.longitude ?? null,
            ownerName: facility.ownerName,
            ownerPhone: facility.ownerPhone,
            ownerEmail: facility.ownerEmail ?? null,
          }
        : null,
      faults: faults.length
        ? faults.map((item) => ({
            id: item.fault?.id ?? item.id,
            name: item.faultName,
            fine: item.fineAmount ?? 0,
          }))
        : [],
      subtotalFine: faults.length ? subtotalFine : undefined,
      syncStatus: inspection.syncStatus,
    };
  }
}
