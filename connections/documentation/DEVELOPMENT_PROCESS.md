# Development Process #

## Overview ##

My approach to solving this task and building the integration can be summarised as a 4 steps process:
1. Understanding the lifecycle of an online card payment transaction 
2. Understanding how Stripe implements the lifecycle of an Auth & Capture transaction
3. Review the starter code to understand the requirements
4. Develop each required method
   * Code
   * Test
   * Refactor

---

## 1. Lifecycle of a payment transaction ##

### Resources ###
* [Checkout Blog - Understanding the Card Payment Lifecycle](https://www.checkout.com/blog/post/understanding-the-card-payment-lifecycle)
* [Razorpay Blog - How Online Card Payments Work](https://razorpay.com/blog/how-online-card-payments-work/)
* [Stripe Docs - Overview of Card Payment Flow](https://stripe.com/docs/payments/cards/overview)
* [Card Transaction Types - Securion Pay Academy](https://www.youtube.com/watch?v=YSvNmSC2d18&ab_channel=SecurionPay)
* [Stripe - Introduction to Online Payments](https://stripe.com/en-gr/guides/introduction-to-online-payments)

### Payment Ecosystem and Stripe ###

First of all I tried to understand at a high level what the online payment ecosystem looks like and how does Stripe fit into it. The most generic online transaction will involve 5 parties in a 4 corner model where the corners are:
* Cardholder (customer)
* Issuer (a bank providing the card to the customer)
* Merchant (accepting payment in exchange of goods/services)
* Acquirer (a bank enabling the merchant to receive payments)

At the center of the four corners there are the Card Networks (Visa, Mastercard) through which payment information and funds flow.

![Online Payment Flow](https://github.com/fedeval/integrations-challenge/blob/master/connections/documentation/images/online_payment_flow.png?raw=true)


Stripe fits into this model with a dual role of Payment Gateway and Processor. As a Gateway, it offers software that encrypts credit card information on a merchant‘s server and sends it to the acquirer. As a Processor, it facilitates the credit card transaction by sending payment information between the merchant, the issuing bank, and the acquirer.

### Transaction Phases ###

The next step was for me to get a sense of the various phases of a transaction, and how they are connected to the three method I was required to implement `authorize()`, `capture()`, `cancel()`

At the very minimum a transaction involves 3 phases:
1. Authentication - The identity of the Cardholder and the validity of the payment method is verified.
2. Authorization - A verification that the amount of funds required for the transaction is available for the specific payment method, and the funds are blocked 
3. Capture - The transaction is settled and the funds are transfered to the Merchant's account

Often 2 and 3 happen at the same time, but in our case we are creating an integration where Authorisation and Capture happen in two distinct moments, allowing for a Cancel option between the two actions, while the funds are blocked but not yet trasnfered.

---

## 2. Stripe Implementation ##

### Resources ###
* [Stripe Docs - Place on Hold a Card](https://stripe.com/docs/payments/capture-later)
* [Stripe Docs - PaymentIntents API](https://stripe.com/docs/api/payment_intents)


### Authorization ###

Authorizing a payment in Stripe is the equivalent of creating a PaymentIntent object. To create a PaymentIntent we can use a `POST` request to the PaymentIntents API endpoint which requires a secret API key as an Authorization Bearer Token in the headers, and a body including at least an `amount` and `currency`parameters. Where: 
* `amount`: positive integer representing how much to charge in the smallest currency unit (e.g., 100 cents to charge $1.00 or 100 to charge ¥100, a zero-decimal currency).
* `currency`: three-letter ISO currency code, in lowercase.

```bash
curl https://api.stripe.com/v1/payment_intents \
  -u SECRET_API_KEY: \
  -d "amount"=1099 \
  -d "currency"="eur" \
```

Note that by default the PaymentIntents API sets the `capture_method` parameter to `automatic`, meaning Authorization and Capture are executed automatically in sequence. IN our case, we want to execute Capture separately, hence we need to add the parameter `capture_method=manual` to the body of our API request.


### Capture ###

After the card is authorized, the PaymentIntent status will transition to `requires_capture`. To capture the authorized funds, we can make a PaymentIntent capture `POST` request as such:

```bash
curl https://api.stripe.com/v1/payment_intents/PAYMENT_INTENT_ID/capture \
  -u SECRET_API_KEY:
```

Note that we only need to provide a PaymentIntent ID and the secret API key.


### Cancel ###

As part of our integration we also want the option to cancel a PaymentIntent if we no longer intend to use it to collect payment from the customer. To do so, we can make a PaymentIntent cancel `POST` request:

```bash
curl https://api.stripe.com/v1/payment_intents/PAYMENT_INTENT_ID/cancel \
  -u SECRET_API_KEY:
```

As for the cancel request, we only need to provide a PaymentIntent ID and the secret API key.

---

## 3. Review the starter code ##

### Resources ###
* [Stripe Docs - PaymentMethods API](https://stripe.com/docs/api/payment_methods)
* [Stripe Docs - Declines](https://stripe.com/docs/declines)

### Summary ###

This step was necessary to understand the shape of each data structure used in the integration, which input parameters would be used for each method as well as the expected shape of the output. The key file I reviewed were:
* `app-framework/index.d.ts`: To see all the type definitions and interfaced used in the integretion.
* `common/HTTPClient.ts`: To understand how the requests to Stripe's endpoint would be sent and handled.
* `connections/main.ts`: To understand how the method would be tested and se examples of how the input parameters where provided.

### Payment Methods ###

One key thing I noticed at this stage was that in the Authorize method in `main.ts` a CardDetails interface was passed as an input parameter containing details on the payment method. However, the PaymentIntents API endpoint only takes a `payment_method` id as an optional parameter stating: 
the ID of the payment method (a PaymentMethod, Card, or compatible Source object) to attach to this PaymentIntent. 

Reading through the docs I found another endpoint which allows us to create a PaymentMethod objects representing a customer's payment instruments.

```bash
curl https://api.stripe.com/v1/payment_methods \
  -u SECRET_API_KEY: \
  -d type=card \
  -d "card[number]"=4242424242424242 \
  -d "card[exp_month]"=7 \
  -d "card[exp_year]"=2022 \
  -d "card[cvc]"=314 \
  -d "billing_details[name]"="Foo Bar"
```
The API only requires a `type` parameter, which is an enum taking 18 different methods. In our case, the only other information provided were card details and the name of the cardholder. We can then pass the `id` of the PaymentMethod object this API request returns to as a parameter in the body of our PaymentIntent request.

### Error Handling ###

Reading through the `app-framework/index.d.ts` was helpful to understand how to handle failed and/or declined API request since no error handling was done included in the `common/HTTPClient.ts`. In this case the distinction between a `FAILED`request and a `DECLINED` one stood out to me and doing some research in the stripe docs I found that there are three possible reasons why a credit card payment might fail:

1. Payments declined by card issuers
2. Blocked payments
3. Invalid API calls

The first reason is the only one for which the object returned by the API call includes a [decline_code](https://stripe.com/docs/declines/codes) such as for example `do_not_honor` or `insufficient_funds` which were options provided in the `DeclineReason`interface in the started code. Hence, I opted to consider as `DECLINED` all requests that would include a `decline_code`and as `FAILED` all other request that would return some sort of error.

To handle errors I created a utility function which I put in a separate `utils.ts` module to keep code modular and more readable.

---

## 4. Writing the code ##

### Testing API Endpoints ###

As a final step before actually starting to write some code I used [Postman](https://www.postman.com/) to test Stripe's API endpoints, see what was the expect shape of the request as well as that of the response objects. This was particularly helpful to figure out that:

* Authentication is done through Bearer Tokens in the request headers where the token is the Secret API Key provided in the Stripe dashboard.
* The API requires `'application/x-www-form-urlencoded'` as a Content Type rather than JSON or plain text for instance.

### Code, Test, Refactor ###

Once I had been through all the steps described the code I got into writing the actual code. I stress tested my code both using `console.log`and modifying the input parameters in the `main.ts` manually during development as well as using some inputs provided by Stripe at [https://stripe.com/docs/testing](https://stripe.com/docs/testing) to run automated unit tests using Jasmine. I have included comments in the code itself to document how I broke down each methods in different steps.
