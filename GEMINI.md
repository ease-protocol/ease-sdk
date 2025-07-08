# EASE SDK

This repository contains the source code for the EASE SDK.

## Development

### Prerequisites

- Node.js
- npm

### Installation

To install the dependencies, run the following command:

```bash
npm install
```

### Building

To build the project, run the following command:

```bash
npm run build
```

This will compile the TypeScript code and output the JavaScript files in the `dist` directory.

### Testing

To run the tests, use the following command:

```bash
npm test
```

This will execute the test files located in the `__tests__` directory using Jest.

### Linting

To lint the code, run the following command:

```bash
npm run lint
```

This will check the code for any linting errors using ESLint.

### Formatting

To format the code, run the following command:

```bash
npm run format
```

This will format the code using Prettier.

### Documentation

To generate the API documentation, run the following command:

```bash
npm run docs
```

This will generate markdown documentation in the `docs` directory using TypeDoc.

## Telemetry

This plan outlines the steps to integrate a basic telemetry system into the EASE SDK, focusing on event logging and error tracking using Sentry.

### Plan: Add Telemetry to EASE SDK (Detailed with Sentry)

1.  **Telemetry Module (`src/telemetry/index.ts`)**:
    - **Step 1.1: Create `src/telemetry/index.ts`**:
      - Define a `Telemetry` class with a private `_enabled` flag.
      - Implement a constructor that takes an initial configuration.
    - **Step 1.2: Implement `Telemetry.init(config)`**:
      - A public method to set the `_enabled` flag based on the provided configuration.
      - **Integrate Sentry**: If `enabled` is true, initialize Sentry using `@sentry/browser` or `@sentry/node` (depending on the SDK's target environment). Configure it with a DSN and any other necessary options (e.g., `environment`, `release`).
    - **Step 1.3: Implement `Telemetry.trackEvent(eventName: string, properties?: Record<string, any>)`**:
      - Checks the `_enabled` flag. If true, use Sentry's `addBreadcrumb` to log the event, or `captureMessage` for more significant events.
      - Ensure properties are sanitized to remove sensitive information before sending to Sentry.
    - **Step 1.4: Implement `Telemetry.trackError(error: Error, properties?: Record<string, any>)`**:
      - Checks the `_enabled` flag. If true, use Sentry's `captureException` to report the error.
      - Pass the caught error object and relevant context (e.g., `operationName`, input parameters if non-sensitive) as `extra` data to Sentry.
    - **Step 1.5: Export a singleton instance**:
      - Export a default `telemetry` instance of the `Telemetry` class to ensure consistent usage across the SDK.

2.  **Integration Points**:
    - **Step 2.1: Identify Core Operations**:
      - `src/login/index.ts`: `login`, `loginCallback`
      - `src/join/index.ts`: `join`, `joinCallback`
      - `src/wallet/index.ts`: `getWalletBalance`, `getWalletHistory`
      - `src/api/index.ts`: `internalApi` (for all API calls)
    - **Step 2.2: Add `trackEvent` for Success**:
      - In each identified function, add a `telemetry.trackEvent` call upon successful completion.
      - Include `operationName` and relevant success metrics (e.g., `durationMs`).
    - **Step 2.3: Add `trackError` for Failures**:
      - In each identified function's `catch` block, add a `telemetry.trackError` call.
      - Pass the caught error object and relevant context (e.g., `operationName`, input parameters if non-sensitive).
    - **Step 2.4: Implement `internalApi` tracking**:
      - Modify `src/api/index.ts` (`internalApi`) to track all API requests, including URL (sanitized), method, and response status. This will provide a centralized view of network interactions.

3.  **SDK Configuration**:
    - **Step 3.1: Update `src/index.ts` (or central config)**:
      - Add a `telemetryEnabled: boolean` property to the main SDK configuration interface. Default to `false`.
      - Add a `sentryDsn: string` property to the main SDK configuration interface, which will be required if `telemetryEnabled` is true.
    - **Step 3.2: Initialize Telemetry with Config**:
      - In the SDK's main initialization logic, pass the `telemetryEnabled` flag and `sentryDsn` to `telemetry.init()`.

4.  **Unit Tests (`__tests__/telemetry.test.ts`)**:
    - **Step 4.1: Create `__tests__/telemetry.test.ts`**:
      - Set up a new test suite for the `Telemetry` module.
    - **Step 4.2: Test `Telemetry.trackEvent`**:
      - Verify that Sentry's `addBreadcrumb` or `captureMessage` is called with correct arguments when telemetry is enabled.
      - Verify that Sentry functions are _not_ called when telemetry is disabled.
    - **Step 4.3: Test `Telemetry.trackError`**:
      - Verify that Sentry's `captureException` is called with correct error details when telemetry is enabled.
      - Verify that Sentry functions are _not_ called when telemetry is disabled.
    - **Step 4.4: Test Integration Points (Basic)**:
      - Add simple tests to ensure that `telemetry.trackEvent` and `telemetry.trackError` are invoked within a few key SDK functions (e.g., `login`, `getWalletBalance`) when those functions are called.

5.  **Documentation**:
    - **Step 5.1: Update `GEMINI.md`**:
      - Add a new top-level section "Telemetry" under "Development".
      - Explain the purpose of telemetry (e.g., "to collect anonymous usage data and error reports to improve SDK stability and performance").
      - Describe how users can enable/disable telemetry via the SDK configuration, including the requirement for a Sentry DSN.
      - Clearly state what data is collected (event names, non-sensitive properties, error types, stack traces) and explicitly mention what is _not_ collected (PII, sensitive user data).
      - Emphasize privacy and data minimization.

## Project Structure

The project is organized as follows:

- `src`: Contains the source code of the SDK, written in TypeScript.
  - `api`: Contains the API client.
  - `enclave`: Contains the enclave functionality.
  - `join`: Contains the join functionality.
  - `login`: Contains the login functionality.
  - `logout`: Contains the logout functionality.
  - `phone`: Contains the phone functionality.
  - `transaction`: Contains the transaction functionality.
  - `utils`: Contains utility functions.
  - `wallet`: Contains the wallet functionality.
- `__tests__`: Contains the tests for the SDK.
- `dist`: Contains the compiled JavaScript code.
- `node_modules`: Contains the project dependencies.
- `package.json`: Contains the project metadata and dependencies.
- `tsconfig.json`: Contains the TypeScript configuration.
- `jest.config.mjs`: Contains the Jest configuration.
- `eslint.config.js`: Contains the ESLint configuration.
- `tsup.config.ts`: Contains the tsup configuration.
