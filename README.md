![npm version](https://img.shields.io/npm/v/@ease-protocol/ease-sdk?style=flat-square) ![Build Status](https://github.com/ease-protocol/ease-sdk/actions/workflows/ci.yml/badge.svg) ![License](https://img.shields.io/npm/l/@ease-protocol/ease-sdk?style=flat-square)

# EASE SDK

This repository contains the source code for the EASE SDK, a comprehensive TypeScript library designed to facilitate seamless interaction with the EASE Protocol. It provides a robust and easy-to-use interface for integrating various functionalities of the EASE ecosystem into your applications.

## Table of Contents

- [EASE SDK](#ease-sdk)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Development](#development)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Building](#building)
    - [Testing](#testing)
    - [Linting](#linting)
    - [Formatting](#formatting)
    - [API Documentation Generation](#api-documentation-generation)
  - [Project Structure](#project-structure)
  - [Usage](#usage)
    - [Installation](#installation-1)
    - [Basic Example](#basic-example)
  - [API Documentation](#api-documentation)
  - [Contributing](#contributing)
    - [Setting up Your Development Environment](#setting-up-your-development-environment)
    - [Running Tests](#running-tests)
    - [Code Style](#code-style)
    - [Submitting Changes](#submitting-changes)
  - [Support](#support)
  - [License](#license)
  - [Publishing to npm](#publishing-to-npm)
  - [Generate a new PAT](#generate-a-new-pat)

## Features

The EASE SDK provides a wide range of features to interact with the EASE Protocol, including:

- **User Authentication**: Secure login and logout functionalities.
- **User Management**: Join and manage user accounts.
- **Wallet Operations**: Manage cryptocurrency wallets, including balance checks and transaction history.
- **Transaction Management**: Create and process various types of transactions.
- **Phone Integration**: OTP verification and other phone-related functionalities.
- **Contact Management**: Add, delete, and search for contacts within the EASE ecosystem.
- **Google Integration**: Seamless integration with Google services.
- **Secure Enclave Interaction**: Functionality for secure operations.
- **Token Refresh**: Automated handling of access token refreshing.
- **Error Handling**: Comprehensive error handling with specific error codes and messages.
- **Logging**: Configurable logging for development and debugging.

## Development

### Prerequisites

To set up the development environment for the EASE SDK, you need the following:

- **Node.js**: Version 18 or higher.
- **npm**: Node Package Manager, typically installed with Node.js.

### Installation

To install the project dependencies, navigate to the root directory of the repository and run:

```bash
npm install
```

This command fetches all necessary packages defined in `package.json`.

### Building

To compile the TypeScript source code into JavaScript, run the build command:

```bash
npm run build
```

The compiled JavaScript files and their corresponding type definitions will be output to the `dist` directory.

### Testing

To ensure the stability and correctness of the SDK, run the unit tests using Jest:

```bash
npm test
```

Tests are located in the `__tests__` directory and follow a `.test.ts` naming convention.

### Linting

To maintain code quality and consistency, lint the codebase with ESLint:

```bash
npm run lint
```

This command identifies and reports potential issues and style violations.

### Formatting

For consistent code formatting, use Prettier:

```bash
npm run format
```

This command automatically formats the code according to the project's Prettier configuration.

### API Documentation Generation

To generate comprehensive API documentation in Markdown format, run:

```bash
npm run docs
```

The generated documentation will be available in the `docs` directory.

## Project Structure

The project is organized as follows:

- `src`: Contains the core source code of the SDK, written in TypeScript.
  - `api`: Handles communication with internal and external APIs.
  - `enclave`: Functionality related to secure enclaves.
  - `join`: Logic for user registration and joining the platform.
  - `login`: Handles user authentication and login processes.
  - `logout`: Manages user logout procedures.
  - `phone`: Functionality for phone-related operations (e.g., OTP).
  - `refresh`: Handles token refresh mechanisms.
  - `transaction`: Manages transaction creation and processing.
  - `contacts`: Contains the contacts functionality.
  - `google`: Integrates with Google services.
  - `utils`: A collection of utility functions and helpers.
  - `wallet`: Manages wallet-related operations (e.g., balance, history).
- `__tests__`: Contains all unit and integration tests for the SDK.
- `dist`: Output directory for compiled JavaScript and type definition files.
- `node_modules`: Directory containing installed npm dependencies.
- `package.json`: Project metadata, scripts, and dependency declarations.
- `tsconfig.json`: TypeScript compiler configuration.
- `jest.config.mjs`: Jest test runner configuration.
- `eslint.config.js`: ESLint linter configuration.
- `tsup.config.ts`: tsup bundler configuration.

## Usage

### Installation

To use the EASE SDK in your project, install it via npm:

```bash
npm install @ease-protocol/ease-sdk
```

### Basic Example

```typescript
import { login, loginCallback, setEnvironment } from '@ease-protocol/ease-sdk';

// Set the environment (e.g., 'production', 'staging', 'develop')
setEnvironment('develop');

async function authenticateUser() {
  try {
    // Step 1: Get login options
    const { sessionId, publicKey } = await login();
    console.log('Login options received:', { sessionId, publicKey });

    // In a real application, you would now use publicKey to prompt the user for WebAuthn authentication.
    // For this example, we'll simulate a successful credential response.
    const mockCredential = {
      id: 'mock-credential-id',
      rawId: new ArrayBuffer(8), // Simulate ArrayBuffer
      response: {
        clientDataJSON: new ArrayBuffer(8), // Simulate ArrayBuffer
        authenticatorData: new ArrayBuffer(8), // Simulate ArrayBuffer
        signature: new ArrayBuffer(8), // Simulate ArrayBuffer
      },
      type: 'public-key' as const,
    };

    // Step 2: Call login callback with the credential
    const { accessToken, refreshToken } = await loginCallback(mockCredential, sessionId);
    console.log('Login successful!', { accessToken, refreshToken });

    // You can now use the accessToken for subsequent authenticated API calls.
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

authenticateUser();
```

## API Documentation

Detailed API documentation, including all available functions, their parameters, and return types, can be generated locally by running `npm run docs`. The generated Markdown files will be located in the `docs` directory.

## Contributing

We welcome contributions to the EASE SDK! Please follow these guidelines to ensure a smooth collaboration process.

### Setting up Your Development Environment

1.  **Fork the repository**: Start by forking the `ease-sdk` repository on GitHub.
2.  **Clone your fork**:
    ```bash
    git clone https://github.com/your-username/ease-sdk.git
    cd ease-sdk
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Create a new branch**:
    ```bash
    git checkout -b feature/your-feature-name
    ```

### Running Tests

Before submitting any changes, ensure all tests pass and add new tests for your features or bug fixes.

```bash
npm test
```

### Code Style

We use ESLint and Prettier to enforce code style. Please run the following commands before committing your changes:

```bash
npm run lint
npm run format
```

### Submitting Changes

1.  **Commit your changes**: Write clear, concise commit messages.
2.  **Push to your fork**:
    ```bash
    git push origin feature/your-feature-name
    ```
3.  **Create a Pull Request**: Open a pull request from your fork to the `main` branch of the original repository. Provide a detailed description of your changes.

## Support

If you encounter any issues, have questions, or need assistance, please refer to the following resources:

- **GitHub Issues**: For bug reports and feature requests, please open an issue on our [GitHub repository](https://github.com/ease-protocol/ease-sdk/issues).
- **Documentation**: Refer to the [API Documentation](#api-documentation) for detailed information on SDK functionalities.

## License

This project is licensed under the ISC License. See the `LICENSE` file for more details.

## Publishing to npm

To publish a new version of the npm package, follow these steps:

1.  **Update the version number** in `package.json` using `npm version`. This command will also create a new git tag.

    ```bash
    npm version <new-version> # e.g., npm version 1.0.2 or npm version patch
    ```

2.  **Build the project** to ensure the `dist` directory is up-to-date:

    ```bash
    npm run build
    ```

3.  **Publish the package** to the npm registry. This project is configured to publish to GitHub Packages.

    ```bash
    npm publish
    ```

4.  **Push the new tag** to your git remote:

    ```bash
    git push --tags
    ```

# Generate a new PAT

Go to https://github.com/settings/tokens
