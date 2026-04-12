import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { SmsService } from './sms.service';
import { SmsLogEntity } from './entities/sms-log.entity';

@ApiTags('sms')
@Controller('sms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('logs')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
  )
  async logs(
    @Req() request: Request,
    @Query('limit') limit?: string,
  ): Promise<ResponseDto<SmsLogEntity[]>> {
    const responseService = new ResponseService(request);
    const payload = await this.smsService.findRecent(
      limit ? Number(limit) : 20,
    );
    return responseService.makeResponse({
      message: 'SMS logs loaded',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }
}
