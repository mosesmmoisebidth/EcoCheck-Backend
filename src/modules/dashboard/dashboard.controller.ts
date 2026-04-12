import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/types/jwt-payload';
import { DashboardService, DashboardFilters } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async stats(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('officer_id') officerId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
  ): Promise<ResponseDto<Record<string, number>>> {
    const responseService = new ResponseService(request);
    const filters: DashboardFilters = {
      district,
      sector,
      officerId,
      startDate,
      endDate,
      visitType,
      decision,
    };
    return responseService.makeResponse({
      message: 'Dashboard stats loaded',
      payload: await this.dashboardService.getStats(user, filters),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('top-offenders')
  async topOffenders(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('officer_id') officerId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
    @Query('limit') limit?: string,
  ): Promise<ResponseDto<unknown[]>> {
    const responseService = new ResponseService(request);
    const filters: DashboardFilters = {
      district,
      sector,
      officerId,
      startDate,
      endDate,
      visitType,
      decision,
    };
    return responseService.makeResponse({
      message: 'Top offenders loaded',
      payload: await this.dashboardService.getTopOffenders(
        user,
        filters,
        limit ? Number(limit) : undefined,
      ),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('charts/inspections-over-time')
  async inspectionsOverTime(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('officer_id') officerId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
    @Query('group_by') _groupBy?: string,
  ): Promise<ResponseDto<unknown[]>> {
    const responseService = new ResponseService(request);
    const filters: DashboardFilters = {
      district,
      sector,
      officerId,
      startDate,
      endDate,
      visitType,
      decision,
    };
    return responseService.makeResponse({
      message: 'Inspections over time loaded',
      payload: await this.dashboardService.getInspectionsOverTime(user, filters),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('charts/compliance-trend')
  async complianceTrend(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('officer_id') officerId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
    @Query('group_by') _groupBy?: string,
  ): Promise<ResponseDto<unknown[]>> {
    const responseService = new ResponseService(request);
    const filters: DashboardFilters = {
      district,
      sector,
      officerId,
      startDate,
      endDate,
      visitType,
      decision,
    };
    return responseService.makeResponse({
      message: 'Compliance trend loaded',
      payload: await this.dashboardService.getComplianceTrend(user, filters),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('charts/decisions-breakdown')
  async decisionsBreakdown(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('officer_id') officerId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
  ): Promise<ResponseDto<unknown[]>> {
    const responseService = new ResponseService(request);
    const filters: DashboardFilters = {
      district,
      sector,
      officerId,
      startDate,
      endDate,
      visitType,
      decision,
    };
    return responseService.makeResponse({
      message: 'Decisions breakdown loaded',
      payload: await this.dashboardService.getDecisionsBreakdown(user, filters),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('charts/visit-type-distribution')
  async visitTypeDistribution(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('officer_id') officerId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
  ): Promise<ResponseDto<unknown[]>> {
    const responseService = new ResponseService(request);
    const filters: DashboardFilters = {
      district,
      sector,
      officerId,
      startDate,
      endDate,
      visitType,
      decision,
    };
    return responseService.makeResponse({
      message: 'Visit type distribution loaded',
      payload: await this.dashboardService.getVisitTypeDistribution(user, filters),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('charts/faults-by-type')
  async faultsByType(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('officer_id') officerId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
  ): Promise<ResponseDto<unknown[]>> {
    const responseService = new ResponseService(request);
    const filters: DashboardFilters = {
      district,
      sector,
      officerId,
      startDate,
      endDate,
      visitType,
      decision,
    };
    return responseService.makeResponse({
      message: 'Faults by type loaded',
      payload: await this.dashboardService.getFaultsByType(user, filters),
      responseType: EResponse.SUCCESS,
    });
  }
}
