**@ease-protocol/ease-sdk**

***

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

got to https://github.com/settings/tokens
