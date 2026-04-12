import { Controller, Get, Param, Query, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Response } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/types/jwt-payload';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async exportReport(
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user: JwtPayload,
    @Query('format') format?: string,
    @Query('type') type?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('district') district?: string,
    @Query('sector') sector?: string,
    @Query('facility_id') facilityId?: string,
    @Query('facility') facilityName?: string,
    @Query('officer_id') officerId?: string,
    @Query('visit_type') visitType?: string,
    @Query('decision') decision?: string,
  ): Promise<StreamableFile> {
    const resolvedFormat = format?.toLowerCase() === 'csv' ? 'csv' : 'pdf';
    const payload = await this.reportsService.generateReport(user, {
      format: resolvedFormat,
      type,
      startDate,
      endDate,
      district,
      sector,
      facilityId,
      facilityName,
      officerId,
      visitType,
      decision,
    });

    if (resolvedFormat === 'csv') {
      const buffer = Buffer.from(
        typeof payload === 'string' ? payload : payload.toString('utf8'),
        'utf8',
      );
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', 'inline; filename="inspections-report.csv"');
      return new StreamableFile(buffer);
    }

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'inline; filename="inspections-report.pdf"');
    return new StreamableFile(payload as Buffer);
  }

  @Get('summary')
  async summary(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<any>> {
    const responseService = new ResponseService(request);
    const payload = await this.reportsService.summary(user);
    return responseService.makeResponse({
      message: 'Summary loaded',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('inspections/csv')
  async exportCsv(
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user: JwtPayload,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<StreamableFile> {
    const csv = await this.reportsService.exportInspectionsCsv(
      user,
      start ? Number(start) : undefined,
      end ? Number(end) : undefined,
    );
    const buffer = Buffer.from(csv, 'utf8');
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader('Content-Disposition', 'inline; filename="inspections.csv"');
    return new StreamableFile(buffer);
  }

  @Get('inspection/:id/pdf')
  async inspectionPdf(
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const pdf = await this.reportsService.generateInspectionPdf(user, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="inspection-${id}.pdf"`);
    return new StreamableFile(pdf);
  }
}
