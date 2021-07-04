import {
  APIKeyCredentials,
  CardDetails,
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse,
  ProcessorConnection,
  RawAuthorizationRequest,
  RawCancelRequest,
  RawCaptureRequest,
} from '@primer-io/app-framework';

import * as dotenv from 'dotenv';
import HttpClient from '../common/HTTPClient';
import { handleError, setRequestHeaders } from './utils';

dotenv.config();

const StripeConnection: ProcessorConnection<APIKeyCredentials, CardDetails> = {
  name: 'STRIPE',

  website: 'stripe.com',

  configuration: {
    accountId: process.env.STRIPE_ACCOUNT_ID as string,
    apiKey: process.env.STRIPE_API_KEY as string,
  },

  async authorize(
    request: RawAuthorizationRequest<APIKeyCredentials, CardDetails>,
  ): Promise<ParsedAuthorizationResponse> {
    // Get paymentMethod details from params
    const {
      expiryMonth,
      expiryYear,
      cardholderName,
      cvv,
      cardNumber,
    }: CardDetails = request.paymentMethod;

    // Get paymentIntent details from params
    const { amount, currencyCode } = request;

    // Create paymentMethod object using the params in the raw request and the Stripe PaymentMethod API
    const paymentMethodRequestBody = `type=card&billing_details[name]=${cardholderName}&card[number]=${cardNumber}&card[exp_month]=${expiryMonth}&card[exp_year]=${expiryYear}&card[cvc]=${cvv}`;
    const paymentMethodResponse = await HttpClient.request(
      'https://api.stripe.com/v1/payment_methods',
      {
        method: 'post',
        headers: setRequestHeaders(request),
        body: paymentMethodRequestBody,
      },
    );
    const paymentMethod = JSON.parse(paymentMethodResponse.responseText);

    // Handle any errors in the HTTPRequest
    if (paymentMethodResponse.statusCode !== 200) {
      return handleError(paymentMethod.error) as ParsedAuthorizationResponse;
    }

    // Create paymentIntent object using the params in the raw request, the paymentMethod object id and the Stripe PaymentIntent API
    const paymentIntentRequestBody = `amount=${amount}&currency=${currencyCode.toLowerCase()}&confirm=true&payment_method=${
      paymentMethod.id
    }&capture_method=manual`;
    const paymentIntentResponse = await HttpClient.request(
      'https://api.stripe.com/v1/payment_intents',
      {
        method: 'post',
        headers: setRequestHeaders(request),
        body: paymentIntentRequestBody,
      },
    );
    const paymentIntent = JSON.parse(paymentIntentResponse.responseText);

    // Handle any failed request or incorrect status
    if (
      paymentIntentResponse.statusCode !== 200 ||
      paymentIntent.status !== 'requires_capture'
    ) {
      return handleError(paymentIntent.error) as ParsedAuthorizationResponse;
    }

    return {
      processorTransactionId: paymentIntent.id,
      transactionStatus: 'AUTHORIZED',
    };
  },

  async capture(
    request: RawCaptureRequest<APIKeyCredentials>,
  ): Promise<ParsedCaptureResponse> {
    // Capture paymentIntent using the Stripe PaymentIntent API Capture endpoint
    const capturePaymentIntentResponse = await HttpClient.request(
      `https://api.stripe.com/v1/payment_intents/${request.processorTransactionId}/capture`,
      {
        method: 'post',
        headers: setRequestHeaders(request),
        body: '',
      },
    );
    const capturedPaymentIntent = JSON.parse(
      capturePaymentIntentResponse.responseText,
    );

    // Handle any failed request or incorrect status
    if (
      capturePaymentIntentResponse.statusCode !== 200 ||
      capturedPaymentIntent.status !== 'succeeded'
    ) {
      return handleError(capturedPaymentIntent.error) as ParsedCaptureResponse;
    }

    return {
      transactionStatus: 'SETTLED',
    };
  },

  async cancel(
    request: RawCancelRequest<APIKeyCredentials>,
  ): Promise<ParsedCancelResponse> {
    // User the Stripe PaymentIntent  to cancel the transaction
    const cancelPaymentIntentResponse = await HttpClient.request(
      `https://api.stripe.com/v1/payment_intents/${request.processorTransactionId}/cancel`,
      {
        method: 'post',
        headers: setRequestHeaders(request),
        body: '',
      },
    );
    const cancelledPaymentIntent = JSON.parse(
      cancelPaymentIntentResponse.responseText,
    );

    // Handle any failed request or incorrect status
    if (
      cancelPaymentIntentResponse.statusCode !== 200 &&
      cancelledPaymentIntent.status !== 'canceled'
    ) {
      return handleError(cancelledPaymentIntent.error) as ParsedCancelResponse;
    }

    return {
      transactionStatus: 'CANCELLED',
    };
  },
};

export default StripeConnection;
