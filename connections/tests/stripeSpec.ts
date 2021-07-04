import * as dotenv from 'dotenv';
import {
  CardDetails,
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse,
} from '@primer-io/app-framework';
import StripeConnection from '../Stripe';

dotenv.config();

const processorConfig = StripeConnection.configuration;
const testTransaction = {
  amount: 100,
  currencyCode: 'EUR',
};
const testCard: CardDetails = {
  expiryMonth: 4,
  expiryYear: 2022,
  cardholderName: 'Mr Foo Bar',
  cvv: '020',
  cardNumber: '4111111111111111',
};
const testCardErrors = {
  insufficient_fund: '4000000000009995',
  incorrect_number: '4242424242424241',
};

describe('Authorize method', () => {
  it('returns transactionStatus AUTHORIZED when provided valid inputs', async () => {
    const response: ParsedAuthorizationResponse = await StripeConnection.authorize(
      {
        processorConfig,
        ...testTransaction,
        paymentMethod: { ...testCard },
      },
    );
    expect(response.transactionStatus).toBe('AUTHORIZED');
  });

  it('returns a transactionId when provided valid inputs', async () => {
    const response: ParsedAuthorizationResponse = await StripeConnection.authorize(
      {
        processorConfig,
        ...testTransaction,
        paymentMethod: { ...testCard },
      },
    );
    expect(Object.keys(response).includes('processorTransactionId')).toBe(true);
  });

  it('returns transactionStatus DECLINED when authorization request is declined', async () => {
    testCard.cardNumber = testCardErrors.insufficient_fund;
    const response: ParsedAuthorizationResponse = await StripeConnection.authorize(
      {
        processorConfig,
        ...testTransaction,
        paymentMethod: { ...testCard },
      },
    );
    expect(response.transactionStatus).toBe('DECLINED');
  });

  it('returns a declineReason when authorization request is declined', async () => {
    testCard.cardNumber = testCardErrors.insufficient_fund;
    const response: ParsedAuthorizationResponse = await StripeConnection.authorize(
      {
        processorConfig,
        ...testTransaction,
        paymentMethod: { ...testCard },
      },
    );
    expect(Object.keys(response).includes('declineReason')).toBe(true);
  });

  it('returns transactionStatus FAILED when authorization request fails without decline_code', async () => {
    testCard.cardNumber = testCardErrors.incorrect_number;
    const response: ParsedAuthorizationResponse = await StripeConnection.authorize(
      {
        processorConfig,
        ...testTransaction,
        paymentMethod: { ...testCard },
      },
    );
    expect(response.transactionStatus).toBe('FAILED');
  });

  it('returns an errorMessage when authorization request fails without decline_code', async () => {
    testCard.cardNumber = testCardErrors.incorrect_number;
    const response: ParsedAuthorizationResponse = await StripeConnection.authorize(
      {
        processorConfig,
        ...testTransaction,
        paymentMethod: { ...testCard },
      },
    );
    expect(Object.keys(response).includes('errorMessage')).toBe(true);
  });

  afterAll(() => {
    testCard.cardNumber = '4111111111111111';
  });
});

describe('Capture method', () => {
  let authorizedTransaction: ParsedAuthorizationResponse;

  beforeAll(async () => {
    authorizedTransaction = await StripeConnection.authorize({
      processorConfig,
      ...testTransaction,
      paymentMethod: { ...testCard },
    });
  });

  it('returns a SETTLED transactionStatus when funds are successfully captured', async () => {
    const response: ParsedCaptureResponse = await StripeConnection.capture({
      // @ts-ignore eslint-disable
      processorTransactionId: authorizedTransaction.processorTransactionId,
      processorConfig,
    });
    expect(response.transactionStatus).toBe('SETTLED');
  });

  it('returns a FAILED transactionStatus when the request fails', async () => {
    processorConfig.apiKey = 'not a valid key';
    const response: ParsedCaptureResponse = await StripeConnection.capture({
      // @ts-ignore eslint-disable
      processorTransactionId: authorizedTransaction.processorTransactionId,
      processorConfig,
    });
    expect(response.transactionStatus).toBe('FAILED');
  });

  it('returns an errorMessage when the request fails', async () => {
    const response: ParsedCaptureResponse = await StripeConnection.capture({
      // @ts-ignore eslint-disable
      processorTransactionId: authorizedTransaction.processorTransactionId,
      processorConfig,
    });
    expect(Object.keys(response).includes('errorMessage')).toBe(true);
  });

  afterAll(() => {
    processorConfig.apiKey = process.env.STRIPE_API_KEY as string;
  });
});

describe('Cancel method', () => {
  let authorizedTransaction: ParsedAuthorizationResponse;

  beforeAll(async () => {
    authorizedTransaction = await StripeConnection.authorize({
      processorConfig,
      ...testTransaction,
      paymentMethod: { ...testCard },
    });
  });

  it('returns a CANCELLED transactionStatus when funds are successfully canceled', async () => {
    const response: ParsedCancelResponse = await StripeConnection.cancel({
      // @ts-ignore eslint-disable
      processorTransactionId: authorizedTransaction.processorTransactionId,
      processorConfig,
    });
    expect(response.transactionStatus).toBe('CANCELLED');
  });

  it('returns a FAILED transactionStatus when the request fails', async () => {
    processorConfig.apiKey = 'not a valid key';
    const response: ParsedCancelResponse = await StripeConnection.cancel({
      // @ts-ignore
      processorTransactionId: authorizedTransaction.processorTransactionId,
      processorConfig,
    });
    expect(response.transactionStatus).toBe('FAILED');
  });

  it('returns an errorMessage when the request fails', async () => {
    const response: ParsedCancelResponse = await StripeConnection.cancel({
      // @ts-ignore
      processorTransactionId: authorizedTransaction.processorTransactionId,
      processorConfig,
    });
    expect(Object.keys(response).includes('errorMessage')).toBe(true);
  });

  afterAll(() => {
    processorConfig.apiKey = process.env.STRIPE_API_KEY as string;
  });
});
