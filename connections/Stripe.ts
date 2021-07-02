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

import * as dotenv from 'dotenv'
import HttpClient from '../common/HTTPClient';
import { handleError } from './utils'

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
    const paymentMethod = JSON.parse(paymentMethodResponse.responseText)

    // Handle any errors in the HTTPRequest
    if (paymentMethodResponse.statusCode !== 200) {
      return handleError(paymentMethod.error) as ParsedAuthorizationResponse;
    }

    // Create paymentIntent object using the params in the raw request, the paymentMethod object id and the Stripe PaymentIntent API
    const paymentIntentRequestBody = `amount=${amount}&currency=${currencyCode.toLowerCase()}&confirm=true&payment_method=${paymentMethod.id}&capture_method=manual`   
    const paymentIntentResponse = await HttpClient.request('https://api.stripe.com/v1/payment_intents', {
        method: 'post',
        headers: requestHeaders,
        body: paymentIntentRequestBody
      })
    const paymentIntent = JSON.parse(paymentIntentResponse.responseText)

    // Return if response ok and status is require_caputre, return error otherwise
    if (paymentIntentResponse.statusCode === 200 && paymentIntent.status === 'requires_capture') {
      return {
        processorTransactionId: paymentIntent.id,
        transactionStatus: 'AUTHORIZED',
      }
    } else {
      return handleError(paymentIntent.error) as ParsedAuthorizationResponse;
    }
  },

  /**
   * Capture a payment intent
   * This method should capture the funds on an authorized transaction
   */
  async capture(
    request: RawCaptureRequest<APIKeyCredentials>,
  ): Promise<ParsedCaptureResponse> {

    // Set request headers for all post requests
    const requestHeaders = {
      'Authorization': 'Bearer ' + request.processorConfig.apiKey,
      'Content-type': 'application/x-www-form-urlencoded'
    }

    const capturePaymentIntentResponse = await HttpClient.request(`https://api.stripe.com/v1/payment_intents/${request.processorTransactionId}/capture`, {
      method: 'post',
      headers: requestHeaders,
      body: ''
    })
    const capturedPaymentIntent = JSON.parse(capturePaymentIntentResponse.responseText)

    if (capturePaymentIntentResponse.statusCode === 200 && capturedPaymentIntent.status === 'succeeded') {
      return {
        transactionStatus: 'SETTLED'
      }
    } else {
      return handleError(capturedPaymentIntent.error) as ParsedCaptureResponse
    }
  },

  /**
   * Cancel a payment intent
   * This one should cancel an authorized transaction
   */
  async cancel(
    request: RawCancelRequest<APIKeyCredentials>,
  ): Promise<ParsedCancelResponse> {

    // Set request headers for all post requests
    const requestHeaders = {
      'Authorization': 'Bearer ' + request.processorConfig.apiKey,
      'Content-type': 'application/x-www-form-urlencoded'
    }

    // User the Stripe PaymentIntent  to cancel the transaction
    const cancelPaymentIntentResponse = await HttpClient.request(`https://api.stripe.com/v1/payment_intents/${request.processorTransactionId}/cancel`, {
      method: 'post',
      headers: requestHeaders,
      body: ''
    })
    const cancelledPaymentIntent = JSON.parse(cancelPaymentIntentResponse.responseText)
    
    // Return the CANCELLED transactionStatus if the request to the Stripe API was ok, else return error message as well
    if (cancelPaymentIntentResponse.statusCode === 200 && cancelledPaymentIntent.status === 'canceled') {
      return {
        transactionStatus: 'CANCELLED',
      } 
    } else {
      return {
        transactionStatus: 'FAILED',
        errorMessage: cancelledPaymentIntent.error.message
      };
    }
  },
};

export default StripeConnection;
