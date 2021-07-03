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

[Image of Basic Payment Transaction]

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
* [Stripe Docs - PaymentMethods API](https://stripe.com/docs/api/payment_methods)
* [Stripe Docs - Declines](https://stripe.com/docs/declines)

### Authorisation ###

Lorem ipsum

### Capture ###

Lorem ipsum

### Cancel ###

---

## 3. Review the starter code ##

- Types
- Testing
- Implementation of HTTP Client

---

## 4. Code, Test, Refactor ##

### Authorize ###

* Inputs:
* Execution:
* Output:

### Capture ###

* Inputs:
* Execution:
* Output:

### Cancel ###

* Inputs:
* Execution:
* Output:
