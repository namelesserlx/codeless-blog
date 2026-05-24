import { ResponseData, ResponseCode, ErrorResponseData } from '@blog/shared';

export class Response {
    static success<T>(data: T, message: string = 'success'): ResponseData<T> {
        return {
            code: ResponseCode.SUCCESS,
            data,
            message,
        };
    }

    static error(message: string = 'error', code: number = ResponseCode.ERROR): ErrorResponseData {
        return {
            code,
            data: null,
            message,
        };
    }

    static unauthorized(message: string = '未登录'): ErrorResponseData {
        return {
            code: ResponseCode.UNAUTHORIZED,
            data: null,
            message,
        };
    }

    static forbidden(message: string = '无权限'): ErrorResponseData {
        return {
            code: ResponseCode.FORBIDDEN,
            data: null,
            message,
        };
    }
}
