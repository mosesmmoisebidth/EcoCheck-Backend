/* eslint-disable @typescript-eslint/ban-types */
import { InternalServerErrorException } from '@nestjs/common';

export class InternalServerErrorCustomException extends InternalServerErrorException {
  constructor(message = 'Internal Server Error', errors?: Object) {
    super({ message, errors });
  }
}
