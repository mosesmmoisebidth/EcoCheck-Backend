import {
  HttpStatus,
  ValidationError,
  ValidationPipeOptions,
} from '@nestjs/common';
import { UnprocessableEntityCustomException } from '../http/exceptions/unprocessable-entity.exception';

const validationOptions: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  exceptionFactory: (errors: ValidationError[]) =>
    new UnprocessableEntityCustomException(
      'Unprocessable Entity Error',
      errors.reduce((accumulator, currentValue) => {
        const constraints = currentValue.constraints ?? {};
        const messages = Object.values(constraints);
        return {
          ...accumulator,
          [currentValue.property]:
            messages.length > 0 ? messages.join(', ') : 'Invalid value',
        };
      }, {}),
    ),
};

export default validationOptions;
