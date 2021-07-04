import {
  DeclineReason,
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse,
  RawAuthorizationRequest,
  RawCaptureRequest,
  RawCancelRequest,
  APIKeyCredentials,
  CardDetails,
} from '@primer-io/app-framework';

// Utility to handle request errors
export function handleError(error: {
  decline_code?: string; // eslint-disable-line
  message: string;
}): ParsedAuthorizationResponse | ParsedCaptureResponse | ParsedCancelResponse {
  if (error.decline_code) {
    let declineReason: DeclineReason = 'UNKNOWN';

    switch (error.decline_code) {
      case 'do_not_honor':
        declineReason = 'DO_NOT_HONOR';
        break;

      case 'insufficient_funds':
        declineReason = 'INSUFFICIENT_FUNDS';
        break;

      default:
        break;
    }
    return {
      declineReason,
      transactionStatus: 'DECLINED',
    };
  }
  return {
    errorMessage: error.message,
    transactionStatus: 'FAILED',
  };
}

// Utility to set API request headers
export function setRequestHeaders(
  request:
    | RawAuthorizationRequest<APIKeyCredentials, CardDetails>
    | RawCaptureRequest<APIKeyCredentials>
    | RawCancelRequest<APIKeyCredentials>,
): {
  'Authorization': string;
  'Content-type': string;
} {
  return {
    'Authorization': `Bearer ${request.processorConfig.apiKey}`,
    'Content-type': 'application/x-www-form-urlencoded',
  };
}
