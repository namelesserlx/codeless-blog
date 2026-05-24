interface ResponsePayload {
    code?: number;
    message?: string;
}

interface ErrorWithResponse {
    message?: string;
    response?: {
        status?: number;
        data?: ResponsePayload;
    };
}

export interface RequestError extends Error {
    status?: number;
    code?: number;
    response?: ErrorWithResponse['response'];
    isRequestError: true;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const asErrorWithResponse = (error: unknown): ErrorWithResponse | undefined => {
    if (!isObject(error)) {
        return undefined;
    }

    return error as ErrorWithResponse;
};

export const getResponseStatus = (error: unknown): number | undefined =>
    asErrorWithResponse(error)?.response?.status;

export const getResponseCode = (error: unknown): number | undefined =>
    asErrorWithResponse(error)?.response?.data?.code;

export const getResponseMessage = (error: unknown, fallback: string): string => {
    const errorWithResponse = asErrorWithResponse(error);
    const responseMessage = errorWithResponse?.response?.data?.message;
    const errorMessage =
        errorWithResponse && typeof errorWithResponse.message === 'string'
            ? errorWithResponse.message
            : undefined;
    if (responseMessage) {
        return responseMessage;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (errorMessage) {
        return errorMessage;
    }

    return fallback;
};

export const createRequestError = (
    message: string,
    options: {
        status?: number;
        code?: number;
        response?: ErrorWithResponse['response'];
    } = {},
): RequestError => {
    const requestError = new Error(message) as RequestError;
    requestError.name = 'RequestError';
    requestError.isRequestError = true;
    requestError.status = options.status;
    requestError.code = options.code;
    requestError.response = options.response;
    return requestError;
};
