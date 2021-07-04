import StripeConnection from '../Stripe';
import {
  CardDetails, 
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse, } from '@primer-io/app-framework';

const processorConfig = StripeConnection.configuration
const testTransaction = {
  amount: 100,
  currencyCode: 'EUR'
}
const testCard: CardDetails = {
  expiryMonth: 4,
  expiryYear: 2022,
  cardholderName: 'Mr Foo Bar',
  cvv: '020',
  cardNumber: '4111111111111111',
}

describe('Authorize method', () => {
  it('returns transactionStatus AUTHORIZED when provided valid inputs', async() => {
    const response: ParsedAuthorizationResponse = await StripeConnection.authorize({
      processorConfig,
      ...testTransaction,
      paymentMethod: { ...testCard }
    })
    expect(response.transactionStatus).toBe('AUTHORIZED')
  })
})