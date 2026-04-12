import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/types/jwt-payload';
import { UsersService } from 'src/modules/users/users.service';
import { FacilityEntity } from '../facilities/entities/facility.entity';
import { InspectionEntity } from '../inspections/entities/inspection.entity';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller('sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly usersService: UsersService,
  ) {}

  @Post('push')
  async push(
    @Req() request: Request,
    @Body() dto: SyncPushDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<any>> {
    const responseService = new ResponseService(request);
    const entity = await this.usersService.findOne(user.sub);
    const payload = await this.syncService.push(dto, entity);
    return responseService.makeResponse({
      message: 'Sync completed',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('conflicts')
  async conflicts(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<any>> {
    const responseService = new ResponseService(request);
    const payload = await this.syncService.listConflicts(user);
    return responseService.makeResponse({
      message: 'Conflicts loaded',
      payload: {
        facilities: payload.facilities.map((facility) =>
          this.mapFacilityResponse(facility),
        ),
        inspections: payload.inspections.map((inspection) =>
          this.mapInspectionResponse(inspection),
        ),
      },
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('pull')
  async pull(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('since') since?: string,
  ): Promise<ResponseDto<any>> {
    const responseService = new ResponseService(request);
    const payload = await this.syncService.pull(user, since ? Number(since) : undefined);
    return responseService.makeResponse({
      message: 'Sync data loaded',
      payload: {
        facilities: payload.facilities.map((facility) =>
          this.mapFacilityResponse(facility),
        ),
        inspections: payload.inspections.map((inspection) =>
          this.mapInspectionResponse(inspection),
        ),
      },
      responseType: EResponse.SUCCESS,
    });
  }

  private mapFacilityResponse(facility: FacilityEntity) {
    return {
      id: facility.id,
      name: facility.name,
      tin: facility.tin,
      ownerName: facility.ownerName,
      ownerPhone: facility.ownerPhone,
      ownerEmail: facility.ownerEmail ?? null,
      district: facility.district,
      sector: facility.sector,
      cell: facility.cell,
      village: facility.village,
      latitude: facility.latitude ?? null,
      longitude: facility.longitude ?? null,
      photoPath: facility.photoPath ?? null,
      createdAt: facility.createdAt.getTime(),
      updatedAt: facility.updatedAt.getTime(),
      createdBy: facility.createdBy?.id ?? '',
      syncStatus: facility.syncStatus,
    };
  }

  private mapInspectionResponse(inspection: InspectionEntity) {
    return {
      id: inspection.id,
      facilityId: inspection.facility?.id ?? '',
      facilityName: inspection.facilityName,
      visitType: inspection.visitType,
      teamMembers: inspection.teamMembers ?? [],
      inspectionTypeId: inspection.inspectionTypeId ?? null,
      faultCount: inspection.faultCount,
      totalFine: inspection.totalFine,
      adjustmentAmount: inspection.adjustmentAmount,
      adjustmentReason: inspection.adjustmentReason ?? '',
      decision: inspection.decision,
      comments: inspection.comments ?? '',
      recommendations: inspection.recommendations ?? '',
      photoPaths: inspection.photoPaths ?? [],
      createdAt: inspection.createdAt.getTime(),
      updatedAt: inspection.updatedAt.getTime(),
      createdBy: inspection.createdBy?.id ?? '',
      syncStatus: inspection.syncStatus,
    };
  }
}
