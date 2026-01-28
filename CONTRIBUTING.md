# Contributing to XDB-Node

First off, thank you for considering contributing to **XDB-Node**! It’s people like you who make this project better for everyone.

By participating in this project, you agree to abide by our [Code of Conduct](https://github.com/xdb-project/xdb-node/blob/main/CODE_OF_CONDUCT.md).

## How Can I Contribute?

### 1. Reporting Bugs
*   Check the [XDB-Node Issues List](https://github.com/xdb-project/xdb-node/issues) to see if the bug has already been reported.
*   If not, open a [New Bug Report](https://github.com/xdb-project/xdb-node/issues/new). Please provide as much context as possible to help us reproduce the issue.

### 2. Suggesting Enhancements
*   Open an [Enhancement Request](https://github.com/xdb-project/xdb-node/issues/new).
*   Explain why this feature would be valuable for the **XDB-Project** ecosystem.

### 3. Pull Requests (PRs)
1.  **Fork** the repository: [Fork xdb-project/xdb-node](https://github.com/xdb-project/xdb-node/fork).
2.  **Create a branch**: `git checkout -b feature/your-feature-name`.
3.  **Commit your changes**: Use descriptive messages that follow our style guide.
4.  **Push to your fork** and **submit a [Pull Request](https://github.com/xdb-project/xdb-node/pulls)** to our `main` branch.

## Development Setup

To start developing locally, follow ini commands:

1.  **Clone your fork**: 
    ```bash
    git clone https://github.com
    cd xdb-node
    ```
2.  **Install dependencies**:
    ```bash
    pnpm install
    ```
3.  **Add upstream** to keep your local code synced:
    ```bash
    git remote add upstream https://github.com/xdb-project/xdb-node.git
    ```
4.  **Sync with upstream**:
    ```bash
    git pull upstream main
    ```

## Style Guide

*   **Linting & Formatting**: We use **Prettier** to maintain code consistency across the driver. Please run `pnpm run format` to fix formatting issues before committing.
*   **Quality Control**: Before submitting a PR, ensure the driver passes all checks by running `pnpm run format:check` and `pnpm test`.
*   **Documentation**: If you add new driver capabilities or update the client implementation, please update the [README.md](https://github.com/xdb-project/xdb-node/blob/main/README.md).
*   **Atomic Commits**: Keep your Pull Requests focused. Submit separate PRs for unrelated driver fixes or features.

## Recognition
All contributors who have their PRs merged will be officially recognized in our [CONTRIBUTORS.md](https://github.com/xdb-project/xdb-node/blob/main/CONTRIBUTORS.md) file.

## Questions?
Reach out via email at [xdbproject@gmail.com](mailto:xdbproject@gmail.com) or join the conversation on [XDB GitHub Discussions](https://github.com/xdb-project/xdb-node/discussions).

---
*Happy Coding!*
**[XDB-Project Team](https://github.com/xdb-project)**
