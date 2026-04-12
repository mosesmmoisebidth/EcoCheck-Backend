import { Request } from 'express';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { EResponse } from 'src/common/enums/response-type.enum';

type ResponsePayload<T> = {
  message: string;
  payload: T;
  responseType: EResponse;
};

export class ResponseService {
  constructor(private readonly request: Request) {}

  makeResponse<T>({
    message,
    payload,
    responseType,
  }: ResponsePayload<T>): ResponseDto<T> {
    return {
      success: responseType === EResponse.SUCCESS,
      message,
      payload,
      path: this.request.originalUrl || this.request.url,
      method: this.request.method,
      timestamp: Date.now(),
    };
  }
}
