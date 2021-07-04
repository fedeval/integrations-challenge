# Integrations Challenge - Connections - Federico Valenza #
---

## Setup ##

### Environment variables ###

I have used the `dotenv` package to keep the Stripe API key and account id safe in a root level `.env` file ignore by git. The file is setup as follows:

``` 
STRIPE_API_KEY=your_key_here
STRIPE_ACCOUNT_ID=your_account_id_here
```

---
## Getting Started ##

### Installing dependencies ###

After cloning the repo, all the project dependencies can be installed using Yarn:

```
yarn install
```

### Running the server ###

To execute the `main.ts` file use the following command in terminal:

```
yarn start:processors
```


### Scripts ###

The following actions can be executed through npm scripts:


#### Testing ####

A set of jasmine testing suites can be used to run unit tests on each of the three methods implemented in `Stripe.ts`:

```
yarn test
```

#### Formatting ####

The code can be automatically formatted using prettier. The formatting options can be customised by editing the `prettier.config.js`file:

```
yarn prettier
```

#### Linting ####

The code can be automatically linted using ESlint. Note that ESlint will also use prettier to test for incorrect formatting. Rules, plugins and extensions for ESlint can be modified through the `.eslintrc.js` file:

```
yarn lint
```
