/* eslint-disable @typescript-eslint/ban-types */
import { NotFoundException } from '@nestjs/common';

export class NotFoundCustomException extends NotFoundException {
  constructor(message = 'Not Found Error', errors?: Object) {
    super({ message, errors });
  }
}
