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

    // Create a payment method object using card details
    const { 
      expiryMonth,
      expiryYear,
      cardholderName,
      cvv,
      cardNumber 
    }: CardDetails = request.paymentMethod

    const paymentMethodRequestBody = `type=card&billing_details[name]=${cardholderName}&card[number]=${cardNumber}&card[exp_month]=${expiryMonth}&card[exp_year]=${expiryYear}&card[cvc]=${cvv}`

    const paymentMethodResponse = await HttpClient.request('https://api.stripe.com/v1/payment_methods', {
      method: 'post',
      headers: requestHeaders,
      body: paymentMethodRequestBody
    })
    const paymentMethod = JSON.parse(paymentMethodResponse.responseText)
  
    // Create a paymentIntent object, authorize if credentials are valid and set to "requires_capture" status
    const {
      amount,
      currencyCode
    } = request

    const paymentIntentRequestBody = `amount=${amount}&currency=${currencyCode.toLowerCase()}&confirm=true&payment_method=${paymentMethod.id}&capture_method=manual`
    const paymentIntentResponse = await HttpClient.request('https://api.stripe.com/v1/payment_intents', {
      method: 'post',
      headers: requestHeaders,
      body: paymentIntentRequestBody
    })

    const paymentIntent = JSON.parse(paymentIntentResponse.responseText)

    // TODO: parse the auth response

    throw new Error('Method Not Implemented');
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
  cancel(
    request: RawCancelRequest<APIKeyCredentials>,
  ): Promise<ParsedCancelResponse> {
    throw new Error('Method Not Implemented');
  },
};

export default StripeConnection;
