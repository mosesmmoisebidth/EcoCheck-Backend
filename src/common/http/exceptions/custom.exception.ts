import { BadRequestException, ForbiddenException, HttpException, HttpStatus, InternalServerErrorException, NotFoundException, RequestTimeoutException } from "@nestjs/common";
import { BadRequestCustomException } from "./bad-request.exception";
import { ConflictCustomException } from "./conflict.exception";
import { ForbiddenCustomException } from "./forbidden.exception";
import { InternalServerErrorCustomException } from "./internal-server-error.exception";
import { NotFoundCustomException } from "./not-found.exception";
import { UnauthorizedCustomException } from "./unauthorized.exception";
import { UnprocessableEntityCustomException } from "./unprocessable-entity.exception";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { TimeoutError } from "rxjs";
import { DBErrorCode } from "src/common/enums";
// import { DBErrorCode } from "~/common/enums";

const managedExceptions: any[] = [
   BadRequestCustomException,
   ConflictCustomException,
   ForbiddenCustomException,
   InternalServerErrorCustomException,
   NotFoundCustomException,
   UnauthorizedCustomException,
   UnprocessableEntityCustomException,
   BadRequestException,
   InternalServerErrorException,
   InternalServerErrorCustomException,
   NotFoundException
];

export class CustomException extends HttpException {
   constructor(error: any) {
      if (error.code === DBErrorCode.PgUniqueConstraintViolation) {
         throw new ConflictCustomException("Resource already exists.");
      }
      if (
         error.code === DBErrorCode.PgForeignKeyConstraintViolation ||
         error.code === DBErrorCode.PgNotNullConstraintViolation
      ) {
         throw new BadRequestCustomException("Foreign Key Constraint");
      }

      if(
         error instanceof NotFoundException || 
         error instanceof NotFoundCustomException
      ){
         throw new NotFoundCustomException(error.message);
      }

      if(
         error instanceof ForbiddenCustomException ||
         error instanceof ForbiddenException
      ){
         throw new ForbiddenCustomException(error.message);
      }

      if(
         error instanceof BadRequestCustomException ||
         error instanceof BadRequestException
      ){
         throw new BadRequestCustomException(error.message);
      }

      if(
         error instanceof InternalServerErrorException ||
         error instanceof InternalServerErrorCustomException
      ){
         throw new InternalServerErrorCustomException(error.message);
      }

      if(
         error instanceof RequestTimeoutException
      ){
         throw new RequestTimeoutException(error.message);
      }

      if (error instanceof TimeoutError) {
         throw new RequestTimeoutException(error.message);
      }

      if (error instanceof JsonWebTokenError) {
         throw new BadRequestCustomException("Invalid Token!");
      }
      if (error instanceof TokenExpiredError) {
         throw new BadRequestCustomException("Token Expired!");
      }

      let foundException: HttpException | null = null;
      for (const Exception of managedExceptions) {
         if (error instanceof Exception) {
            foundException = new Exception(error.message, error.errors);
            break;
         }
      }

      if (foundException) {
         super(foundException.getResponse(), foundException.getStatus());
      } else {
         super(
            {
               message: "Internal Server Error"
            },
            HttpStatus.INTERNAL_SERVER_ERROR
         );
      }
   }
}
