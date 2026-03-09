# UI Account Value Acceptance Test

This project contains a browser-based acceptance test that signs into a web account, opens the portfolio page, reads the displayed portfolio total, and validates it against an expected value from configuration

## Tech stack

- TypeScript
- Playwright
- YAML-based configuration
- Environment variables for secrets

## Requirements

- Node.js 18+
- npm
- A valid test account
- A Linux-compatible environment (Ubuntu/Alpine-compatible Playwright setup)

## Installation

1. Clone the repository
2. Install dependencies

Install Playwright browsers
npx playwright install

If you want to install the OS dependencies as well, 

use:
npx playwright install --with-deps

bash
npm install
npm run install:browsers

Copy the example environment file

```python
cp .env.example .env
```

Create a local config file

```javascript
cp config/example.yaml config/local.yaml
```

Fill in:

.env with account credentials

config/local.yaml with the correct base URL, paths, expected value, and selectors

Configuration

Secrets are supplied through environment variables:

```python
APP_USERNAME
```
```python
APP_PASSWORD
```
```python
APP_OTP (optional)
```
The config file is loaded from:

config/local.yaml

You can override it with:

E2E_CONFIG=/path/to/your-config.yaml
1. Create or Refresh the Authenticated Session

Before running the tests, you must generate an authenticated session
npm run auth

What will happen

Playwright opens a browser window in headed mode

The script navigates to the login page

Your username and password are filled automatically using the configured credentials

One of the following login flows may occur:

Device approval required

If your account requires device approval:

A device approval page appears in the Playwright browser

Approve the login request on your phone or trusted device

Return to the Playwright Inspector window

The test will be paused

Click the ▶ Resume / Stop button in the Playwright Inspector to allow the script to continue

Optional prompts

Sometimes a prompt may appear after login (for example: Enable passkeys)

The script will try to dismiss this automatically

Successful authentication

If login completes successfully, Playwright saves the authenticated session here:

playwright/.auth/session.json

All tests reuse this session so they do not need to log in again

2. Run the portfolio validation test

Headless:

npm test

Headed:

npm run test:headed
How it works

tests/auth.setup.spec.ts

Performs login

Handles OTP if configured

Saves authenticated browser state

tests/portfolio-value.spec.ts

Reuses saved browser state

Opens the portfolio page

Extracts the displayed portfolio value

Compares it to the configured expected value

Project structure
config/
  example.yaml
src/
  config/load-config.ts
  utils/money.ts
tests/
  auth.setup.spec.ts
  portfolio-value.spec.ts
playwright.config.ts
Notes

Automating Device Approval in QA using Mailosaur

When running authentication locally, the login flow may require manual device approval. In that case the Playwright test pauses and waits for the user to approve the login

In the QA environment, this step is automated using Mailosaur, which allows Playwright to retrieve the verification code directly from the test email inbox

This removes the need for manual approval and allows the authentication flow to run fully automatically

How it works

The test logs in using the configured QA account.

The application sends a verification email to the QA inbox.

Mailosaur captures this email.

The Playwright test retrieves the message using the Mailosaur API.

The verification code or approval link is extracted.

The test enters the code (or follows the link) automatically.

The login flow continues without any manual interaction.

Mailosaur configuration

To enable this automation, configure the following environment variables.

MAILOSAUR_API_KEY=your_mailosaur_api_key
MAILOSAUR_SERVER_ID=your_mailosaur_server_id

These values allow Playwright to access the Mailosaur inbox used for QA authentication.

Example flow in QA

Authentication runs as follows:

Playwright Login
        
1. Verification email sent

2. Mailosaur captures email
        
3. Playwright reads email
        
4. Verification code extracted
        
5. Code entered automatically
        
6. Authenticated session saved

After successful authentication, the session is saved to:

playwright/.auth/session.json

This session is reused by all tests

When manual approval is still required

Manual approval may still be required when:

Running tests locally with a personal account

Mailosaur is not configured

The login flow uses device approval instead of email verification

In these cases, approve the login manually and resume the test in the Playwright Inspector

Sensitive account information is not stored in source control

The authenticated session file is ignored through .gitignore

The solution is parameterized so the target domain, account details, selectors, and expected value can be changed without modifying test logic

AI assistance disclosure

AI tools were used to help refine some implementation details and documentation structure

The final solution was reviewed, edited, configured, and validated manually