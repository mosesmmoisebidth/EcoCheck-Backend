import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { NullDto } from 'src/common/dtos/null.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthRefreshDto } from './dto/auth-refresh.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { AuthUpdateProfileDto } from './dto/auth-update-profile.dto';
import { AuthActivateDto } from './dto/auth-activate.dto';
import { AuthActivateVerifyDto } from './dto/auth-activate-verify.dto';
import { AuthChangePasswordDto } from './dto/auth-change-password.dto';
import { AuthChangeEmailDto } from './dto/auth-change-email.dto';
import { AuthDeleteDto } from './dto/auth-delete.dto';
import { AuthService } from './auth.service';
import type { JwtPayload } from './types/jwt-payload';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Req() request: Request,
    @Body() dto: AuthLoginDto,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const responseService = new ResponseService(request);
    const payload = await this.authService.login(dto, request);
    return responseService.makeResponse({
      message: 'Login successful',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Body() dto: AuthRefreshDto,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const responseService = new ResponseService(request);
    const payload = await this.authService.refresh(dto, request);
    return responseService.makeResponse({
      message: 'Token refreshed',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Post('activate/verify')
  async verifyActivation(
    @Req() request: Request,
    @Body() dto: AuthActivateVerifyDto,
  ): Promise<ResponseDto<{ valid: boolean; expiresAt?: number }>> {
    const responseService = new ResponseService(request);
    const payload = await this.authService.verifyActivation(dto);
    return responseService.makeResponse({
      message: 'Activation verified',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Post('activate')
  async activate(
    @Req() request: Request,
    @Body() dto: AuthActivateDto,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const responseService = new ResponseService(request);
    const payload = await this.authService.activate(dto, request);
    return responseService.makeResponse({
      message: 'Account activated',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Body() dto: AuthRefreshDto,
  ): Promise<ResponseDto<NullDto>> {
    const responseService = new ResponseService(request);
    await this.authService.logout(dto);
    return responseService.makeResponse({
      message: 'Logged out',
      payload: {} as NullDto,
      responseType: EResponse.SUCCESS,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<AuthUserDto>> {
    const responseService = new ResponseService(request);
    const payload = await this.authService.getProfile(user.sub);
    return responseService.makeResponse({
      message: 'Profile loaded',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateMe(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AuthUpdateProfileDto,
  ): Promise<ResponseDto<AuthUserDto>> {
    const responseService = new ResponseService(request);
    const payload = await this.authService.updateProfile(user.sub, dto);
    return responseService.makeResponse({
      message: 'Profile updated',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AuthChangePasswordDto,
  ): Promise<ResponseDto<NullDto>> {
    const responseService = new ResponseService(request);
    await this.authService.changePassword(user.sub, dto);
    return responseService.makeResponse({
      message: 'Password updated',
      payload: {} as NullDto,
      responseType: EResponse.SUCCESS,
    });
  }

  @Post('change-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changeEmail(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AuthChangeEmailDto,
  ): Promise<ResponseDto<AuthUserDto>> {
    const responseService = new ResponseService(request);
    const payload = await this.authService.changeEmail(user.sub, dto);
    return responseService.makeResponse({
      message: 'Email updated',
      payload,
      responseType: EResponse.SUCCESS,
    });
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteAccount(
    @Req() request: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AuthDeleteDto,
  ): Promise<ResponseDto<NullDto>> {
    const responseService = new ResponseService(request);
    await this.authService.deleteAccount(user.sub, dto);
    return responseService.makeResponse({
      message: 'Account deleted',
      payload: {} as NullDto,
      responseType: EResponse.SUCCESS,
    });
  }
}
