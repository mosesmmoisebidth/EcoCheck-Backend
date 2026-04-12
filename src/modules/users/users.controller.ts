import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ResponseService } from 'src/shared/response/response.service';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';
import { NullDto } from 'src/common/dtos/null.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/types/jwt-payload';
import { envToBool, readEnvValue } from 'src/utils/env.util';
import { MailService } from 'src/modules/mail/mail.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
  )
  async create(
    @Req() request: Request,
    @Body() dto: CreateUserDto,
  ): Promise<ResponseDto<UserResponseDto>> {
    const responseService = new ResponseService(request);
    const result = await this.usersService.create(dto);

    const emailResult = await this.maybeSendActivationEmail(
      result.user,
      result.activationCode,
      result.activationExpiresAt,
    );

    return responseService.makeResponse({
      message: 'User created',
      payload: this.toResponse(
        result.user,
        emailResult.activationCode,
        emailResult.activationExpiresAt,
      ),
      responseType: EResponse.SUCCESS,
    });
  }

  @Post(':id/resend-activation')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
  )
  async resendActivation(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<ResponseDto<UserResponseDto>> {
    const responseService = new ResponseService(request);
    const result = await this.usersService.regenerateActivation(id);

    const emailResult = await this.maybeSendActivationEmail(
      result.user,
      result.activationCode,
      result.activationExpiresAt,
    );

    return responseService.makeResponse({
      message: 'Activation email sent',
      payload: this.toResponse(
        result.user,
        emailResult.activationCode,
        emailResult.activationExpiresAt,
      ),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
  )
  async findAll(
    @Req() request: Request,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ResponseDto<UserResponseDto[]>> {
    const responseService = new ResponseService(request);
    const users = await this.usersService.findAll(
      currentUser.role,
      currentUser.district,
    );
    return responseService.makeResponse({
      message: 'Users loaded',
      payload: users.map((user) => this.toResponse(user)),
      responseType: EResponse.SUCCESS,
    });
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
  )
  async findOne(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<ResponseDto<UserResponseDto>> {
    const responseService = new ResponseService(request);
    const user = await this.usersService.findOne(id);
    return responseService.makeResponse({
      message: 'User loaded',
      payload: this.toResponse(user),
      responseType: EResponse.SUCCESS,
    });
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
  )
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ResponseDto<UserResponseDto>> {
    const responseService = new ResponseService(request);
    const user = await this.usersService.update(id, dto);
    return responseService.makeResponse({
      message: 'User updated',
      payload: this.toResponse(user),
      responseType: EResponse.SUCCESS,
    });
  }

  @Patch(':id/deactivate')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
  )
  async deactivate(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<ResponseDto<UserResponseDto>> {
    const responseService = new ResponseService(request);
    const user = await this.usersService.setActive(id, false);
    return responseService.makeResponse({
      message: 'User deactivated',
      payload: this.toResponse(user),
      responseType: EResponse.SUCCESS,
    });
  }

  @Delete(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_MANAGER,
    UserRole.CITY_MANAGER,
  )
  async remove(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<ResponseDto<NullDto>> {
    const responseService = new ResponseService(request);
    await this.usersService.delete(id);
    return responseService.makeResponse({
      message: 'User deleted',
      payload: {} as NullDto,
      responseType: EResponse.SUCCESS,
    });
  }

  private toResponse(
    user: UserEntity,
    activationCode?: string,
    activationExpiresAt?: Date,
  ): UserResponseDto {
    const activationStatus = user.isActive
      ? 'active'
      : user.activationCodeHash && !user.activationUsedAt
        ? 'pending'
        : 'disabled';
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      district: user.district,
      sector: user.sector,
      isActive: user.isActive,
      activationStatus,
      activationCode,
      activationExpiresAt: activationExpiresAt?.getTime(),
    };
  }

  private async maybeSendActivationEmail(
    user: UserEntity,
    activationCode?: string,
    activationExpiresAt?: Date,
  ): Promise<{ activationCode?: string; activationExpiresAt?: Date }> {
    if (!activationCode || !user.email || user.role !== UserRole.HSO) {
      return { activationCode, activationExpiresAt };
    }

    const shouldSendEmail = envToBool(
      this.configService.get<string>('SEND_ACTIVATION_EMAIL'),
      true,
    );
    if (!shouldSendEmail) {
      return { activationCode, activationExpiresAt };
    }

    try {
      const message = this.buildActivationEmail(
        user,
        activationCode,
        activationExpiresAt,
      );
      await this.mailService.sendMail({
        to: user.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      const returnCode = envToBool(
        this.configService.get<string>('ACTIVATION_CODE_RETURN'),
        false,
      );
      if (!returnCode) {
        return { activationCode: undefined, activationExpiresAt: undefined };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send activation email to ${user.email}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return { activationCode, activationExpiresAt };
  }

  private buildActivationEmail(
    user: UserEntity,
    code: string,
    expiresAt?: Date,
  ): { subject: string; text: string; html: string } {
    const appUrl = readEnvValue(this.configService.get<string>('MOBILE_APP_URL'));
    const androidUrl = readEnvValue(
      this.configService.get<string>('MOBILE_ANDROID_URL'),
    );
    const iosUrl = readEnvValue(this.configService.get<string>('MOBILE_IOS_URL'));
    const expiryText = expiresAt
      ? `This code expires on ${expiresAt.toLocaleString()}.`
      : 'This code expires within 24 hours.';

    const appLines = [appUrl, androidUrl, iosUrl].filter(Boolean) as string[];
    const appText = appLines.length
      ? `Download the HSO mobile app:\n${appLines.join('\n')}`
      : 'Download the HSO mobile app from your organization or app store.';

    const subject = 'Your HSO activation code';
    const text = `Hello ${user.fullName},\n\nYour HSO account has been created. Use this activation code to set your password in the mobile app:\n\n${code}\n\n${expiryText}\n\n${appText}\n\nIf you did not request this account, please ignore this email.`;

    const linksHtml = appLines.length
      ? appLines
          .map((link) => `<div><a href="${link}">${link}</a></div>`)
          .join('')
      : '<div>Download the HSO mobile app from your organization or app store.</div>';

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <p>Hello ${user.fullName},</p>
        <p>Your HSO account has been created. Use this activation code to set your password in the mobile app:</p>
        <div style="font-size: 20px; font-weight: 700; letter-spacing: 2px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; display: inline-block;">
          ${code}
        </div>
        <p style="margin-top: 12px;">${expiryText}</p>
        <p>${linksHtml}</p>
        <p style="margin-top: 16px;">If you did not request this account, please ignore this email.</p>
      </div>
    `;

    return { subject, text, html };
  }
}
