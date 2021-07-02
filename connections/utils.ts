import {
  DeclineReason,
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse,
} from '@primer-io/app-framework';

// Utility to handle request errors
export default function handleError(error: {
  decline_code?: string;
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
