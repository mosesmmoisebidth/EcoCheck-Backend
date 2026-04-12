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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Decision } from 'src/common/enums/decision.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/types/jwt-payload';
import { UsersService } from 'src/modules/users/users.service';
import {
  CreateFacilityDto,
  FacilityMarkerDto,
  FacilityResponseDto,
  UpdateFacilityDto,
} from './dto';
import { FacilitiesService } from './facilities.service';
import { FacilityEntity } from './entities/facility.entity';

@ApiTags('facilities')
@Controller('facilities')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FacilitiesController {
  constructor(
    private readonly facilitiesService: FacilitiesService,
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
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'district', required: false })
  @ApiQuery({ name: 'sector', required: false })
  async findAll(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
  ): Promise<ResponseDto<FacilityResponseDto[]>> {
    const responseService = new ResponseService(request);
    const facilities = await this.facilitiesService.findAll(
      user,
      search,
      district,
      sector,
    );
    const stats = await this.facilitiesService.getInspectionStats(
      facilities.map((facility) => facility.id),
    );
    return responseService.makeResponse({
      message: 'Facilities loaded',
      payload: facilities.map((facility) =>
        this.toResponse(facility, stats.get(facility.id)),
      ),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('map-markers')
  @Roles(
    UserRole.HSO,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiQuery({ name: 'district', required: false })
  @ApiQuery({ name: 'sector', required: false })
  async findMarkers(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
  ): Promise<ResponseDto<FacilityMarkerDto[]>> {
    const responseService = new ResponseService(request);
    const facilities = await this.facilitiesService.findMarkers(
      user,
      district,
      sector,
    );
    const stats = await this.facilitiesService.getInspectionStats(
      facilities.map((facility) => facility.id),
    );
    return responseService.makeResponse({
      message: 'Facility markers loaded',
      payload: facilities.map((facility) => {
        const stat = stats.get(facility.id);
        return {
          id: facility.id,
          name: facility.name,
          latitude: facility.latitude ?? 0,
          longitude: facility.longitude ?? 0,
          district: facility.district,
          sector: facility.sector,
          lastDecision: stat?.lastDecision ?? null,
          lastInspectionDate: stat?.lastInspectionDate
            ? stat.lastInspectionDate.getTime()
            : null,
        };
      }),
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
  ): Promise<ResponseDto<FacilityResponseDto>> {
    const responseService = new ResponseService(request);
    const facility = await this.facilitiesService.findOne(id);
    return responseService.makeResponse({
      message: 'Facility loaded',
      payload: this.toResponse(facility),
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
    @Body() dto: CreateFacilityDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<FacilityResponseDto>> {
    const responseService = new ResponseService(request);
    const entity = await this.usersService.findOne(user.sub);
    const facility = await this.facilitiesService.create(dto, entity);
    return responseService.makeResponse({
      message: 'Facility created',
      payload: this.toResponse(facility),
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
    @Body() dto: UpdateFacilityDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<FacilityResponseDto>> {
    const responseService = new ResponseService(request);
    const entity = await this.usersService.findOne(user.sub);
    const facility = await this.facilitiesService.update(id, dto, entity);
    return responseService.makeResponse({
      message: 'Facility updated',
      payload: this.toResponse(facility),
      responseType: EResponse.SUCCESS,
    });
  }

  private toResponse(
    facility: FacilityEntity,
    stats?: { inspectionsCount: number; lastDecision?: Decision; lastInspectionDate?: Date },
  ): FacilityResponseDto {
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
      inspectionsCount: stats?.inspectionsCount ?? 0,
      lastDecision: stats?.lastDecision ?? null,
      lastInspectionDate: stats?.lastInspectionDate
        ? stats.lastInspectionDate.getTime()
        : null,
    };
  }
}
