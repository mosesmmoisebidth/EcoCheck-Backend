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
import { SectorEntity } from './entities/sector.entity';
import { SectorResponseDto } from './dto/sector-response.dto';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('sectors')
  @Roles(
    UserRole.HSO,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async findSectors(
    @Req() request: Request,
    @Query('district') district?: string,
  ): Promise<ResponseDto<SectorResponseDto[]>> {
    const responseService = new ResponseService(request);
    const sectors = await this.locationsService.findSectors(district);
    return responseService.makeResponse({
      message: 'Sectors loaded',
      payload: sectors.map((sector) => this.toSectorResponse(sector)),
      responseType: EResponse.SUCCESS,
    });
  }

  private toSectorResponse(sector: SectorEntity): SectorResponseDto {
    return {
      id: sector.sectorId,
      name: sector.sectorName,
      districtId: sector.districtId,
    };
  }
}
