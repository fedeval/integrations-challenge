import {
  APIKeyCredentials,
  CardDetails,
  DeclineReason,
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse,
  ProcessorConnection,
  RawAuthorizationRequest,
  RawCancelRequest,
  RawCaptureRequest,
} from '@primer-io/app-framework';

import * as dotenv from 'dotenv'
import HttpClient from '../common/HTTPClient';

dotenv.config()

const StripeConnection: ProcessorConnection<APIKeyCredentials, CardDetails> = {
  name: 'STRIPE',

  website: 'stripe.com',

  configuration: {
    accountId: process.env.STRIPE_ACCOUNT_ID as string,
    apiKey: process.env.STRIPE_API_KEY as string, 
  },

  /**
   *
   * You should authorize a transaction and return an appropriate response
   */
  async authorize(
    request: RawAuthorizationRequest<APIKeyCredentials, CardDetails>,
  ): Promise<ParsedAuthorizationResponse> {

    // Set request headers for all post requests
    const requestHeaders = {
      'Authorization': 'Bearer ' + request.processorConfig.apiKey,
      'Content-type': 'application/x-www-form-urlencoded'
    }

    // Get paymentMethod details from params
    const { 
      expiryMonth,
      expiryYear,
      cardholderName,
      cvv,
      cardNumber 
    }: CardDetails = request.paymentMethod
    
    // Get paymentIntent details from params
    const {
      amount,
      currencyCode
    } = request

    // Create paymentMethod object using the params in the raw request and the Stripe PaymentMethod API
    const paymentMethodRequestBody = `type=card&billing_details[name]=${cardholderName}&card[number]=${cardNumber}&card[exp_month]=${expiryMonth}&card[exp_year]=${expiryYear}&card[cvc]=${cvv}`
    const paymentMethodResponse = await HttpClient.request('https://api.stripe.com/v1/payment_methods', {
      method: 'post',
      headers: requestHeaders,
      body: paymentMethodRequestBody
    })

    // Handle any errors in the HTTPRequest
    if (paymentMethodResponse.statusCode !== 200) {
      const errorObj = JSON.parse(paymentMethodResponse.responseText).error;
      return handleAuthError(errorObj);
    }
    const paymentMethod = JSON.parse(paymentMethodResponse.responseText)

    // Create paymentIntent object using the params in the raw request, the paymentMethod object id and the Stripe PaymentIntent API
    const paymentIntentRequestBody = `amount=${amount}&currency=${currencyCode.toLowerCase()}&confirm=true&payment_method=${paymentMethod.id}&capture_method=manual`   
    const paymentIntentResponse = await HttpClient.request('https://api.stripe.com/v1/payment_intents', {
        method: 'post',
        headers: requestHeaders,
        body: paymentIntentRequestBody
      })
    
    // Handle any errors in the HTTPRequest
    if (paymentIntentResponse.statusCode !== 200) {
      const errorObj = JSON.parse(paymentMethodResponse.responseText).error;
      return handleAuthError(errorObj);
    }
    const paymentIntent = JSON.parse(paymentIntentResponse.responseText)
  
    // Parse the paymentIntent object and return
    return {
      processorTransactionId: paymentIntent.id,
      transactionStatus: 'AUTHORIZED',
    }
  },

  /**
   * Capture a payment intent
   * This method should capture the funds on an authorized transaction
   */
  capture(
    request: RawCaptureRequest<APIKeyCredentials>,
  ): Promise<ParsedCaptureResponse> {
    throw new Error('Method Not Implemented');
  },

  /**
   * Cancel a payment intent
   * This one should cancel an authorized transaction
   */
  async cancel(
    request: RawCancelRequest<APIKeyCredentials>,
  ): Promise<ParsedCancelResponse> {

    const requestHeaders = {
      'Authorization': 'Bearer ' + request.processorConfig.apiKey,
      'Content-type': 'application/x-www-form-urlencoded'
    }

    const cancelPaymentIntentResponse = await HttpClient.request(`https://api.stripe.com/v1/payment_intents/${request.processorTransactionId}/cancel`, {
      method: 'post',
      headers: requestHeaders,
      body: ''
    })
    const cancelledPaymentIntent = JSON.parse(cancelPaymentIntentResponse.responseText)
    
    if (cancelPaymentIntentResponse.statusCode === 200 && cancelledPaymentIntent.status === 'canceled') {
      return {
        transactionStatus: 'CANCELLED',
      } 
    } else {
      return handleAuthError(cancelledPaymentIntent.error);
    }
  },
};


// Error handling utility
function handleAuthError(error): ParsedAuthorizationResponse {
  if (error.code) {
    let declineReason: DeclineReason = 'UNKNOWN'

    switch (error.code) {
      case 'do_not_honor':
        declineReason = 'DO_NOT_HONOR'
        break;

      case 'insufficient_funds':
        declineReason = 'INSUFFICIENT_FUNDS'

      default:
        break;
    }

    const response: ParsedAuthorizationResponse = {
      declineReason: declineReason,
      transactionStatus: 'DECLINED'
    }
    return response
  } else {
    const response: ParsedAuthorizationResponse = {
      errorMessage: error.message,
      transactionStatus: 'FAILED'
    }
    return response
  }
}

export default StripeConnection;
