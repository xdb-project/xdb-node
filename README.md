# XDB-Node

> Blazing fast, lightweight Node.js client for XDB Database Engine with full TypeScript support.

[![npm version](https://img.shields.io/npm/v/@xdb-project/xdb-node.svg)](https://www.npmjs.com/package/@xdb-project/xdb-node)
[![npm downloads](https://img.shields.io/npm/dm/@xdb-project/xdb-node.svg)](https://www.npmjs.com/package/@xdb-project/xdb-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/xdb-project/xdb-node/actions/workflows/ci.yml/badge.svg)](https://github.com/xdb-project/xdb-node/actions/workflows/ci.yml)
[![Code Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://standardjs.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [XDB Server Setup](#xdb-server-setup)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

**XDB-Node** is a modern TypeScript client library for interacting with the XDB database engine—a lightweight, high-performance NoSQL database written in C. It provides a Promise-based API for seamless integration with Node.js applications while maintaining type safety through TypeScript.

The driver handles TCP communication with the XDB server on port 8080, manages connection state, buffers streaming data, and provides comprehensive error reporting with helpful diagnostics.

## ✨ Features

- **Type-Safe API**: Full TypeScript support with generics for compile-time type checking
- **Promise-Based**: Modern async/await syntax for all operations
- **Connection Management**: Automatic connection pooling and error recovery
- **Stream Buffering**: Handles TCP packet fragmentation transparently
- **Error Diagnostics**: Helpful error messages when the server is unavailable
- **Zero Dependencies**: Lightweight implementation using only Node.js built-ins
- **Production Ready**: Thoroughly tested and used in production environments
- **Fixed Port 8080**: Standardized port configuration for seamless deployment

## 📦 Prerequisites

Before using XDB-Node, ensure you have:

| Requirement | Version | Purpose                                                      |
| ----------- | ------- | ------------------------------------------------------------ |
| Node.js     | 18.0+   | JavaScript runtime                                           |
| npm or pnpm | Latest  | Package manager                                              |
| XDB Server  | 1.0+    | Database backend listening on port 8080                      |

## 🚀 Installation

### Via npm

```bash
npm install @xdb-project/xdb-node
```

### Via pnpm

```bash
pnpm add @xdb-project/xdb-node
```

### Via yarn

```bash
yarn add @xdb-project/xdb-node
```

## ⚡ Quick Start

### Basic Connection

The client automatically connects to `localhost:8080`.

```typescript
import { XDBClient } from '@xdb-project/xdb-node';

const db = new XDBClient();

try {
    await db.connect();
    console.log('Connected to XDB Server');
} catch (error) {
    console.error('Connection failed:', error);
}
```

### CRUD Operations

```typescript
import { XDBClient } from '@xdb-project/xdb-node';

interface User {
    username: string;
    email: string;
    active: boolean;
}

const db = new XDBClient();
await db.connect();

// Insert a document
const createResult = await db.insert<User>('users', {
    username: 'alice',
    email: 'alice@example.com',
    active: true,
});

console.log(`Document created with ID: ${createResult.data?._id}`);

// Find documents
const users = await db.find<User>('users', { active: true });
console.log(`Found ${users.data?.length} active users`);

// Count documents
const count = await db.count('users');
console.log(`Total users: ${count.data?.count}`);

// Delete a document
await db.delete('users', createResult.data?._id);

// Close connection
await db.close();
```

## 📚 API Reference

### Constructor

```typescript
new XDBClient()
```

The client automatically connects to `localhost:8080`. No configuration options are available as port 8080 is fixed.

### Methods

#### `connect(): Promise<void>`

Establishes a connection to the XDB server on port 8080.

```typescript
await db.connect();
```

**Throws:** Error if connection to localhost:8080 fails

---

#### `insert<T>(collection: string, data: T): Promise<XDBResponse<InsertResult>>`

Inserts a new document into a collection.

**Parameters:**

- `collection` (string) - Collection name
- `data` (T) - Document data to insert

**Returns:** Promise with inserted document including auto-generated `_id`

**Example:**

```typescript
const result = await db.insert('users', { name: 'Alice', email: 'alice@example.com' });
console.log(result.data?._id); // Auto-generated ID
```

---

#### `find<T>(collection: string, query?: Record<string, any>, limit?: number): Promise<XDBResponse<T[]>>`

Queries documents in a collection with optional filtering.

**Parameters:**

- `collection` (string) - Collection name
- `query` (object, optional) - Filter criteria (exact match semantics)
- `limit` (number, optional) - Maximum number of results to return

**Returns:** Promise with array of matching documents

**Example:**

```typescript
const admins = await db.find('users', { role: 'admin' }, 10);
console.log(`Found ${admins.data?.length} admins`);
```

---

#### `count(collection: string, query?: Record<string, any>): Promise<XDBResponse<CountResult>>`

Returns the count of documents matching a query.

**Parameters:**

- `collection` (string) - Collection name
- `query` (object, optional) - Filter criteria

**Returns:** Promise with count

**Example:**

```typescript
const result = await db.count('users', { active: true });
console.log(`Active users: ${result.data?.count}`);
```

---

#### `delete(collection: string, id: string): Promise<XDBResponse<void>>`

Deletes a document by ID.

**Parameters:**

- `collection` (string) - Collection name
- `id` (string) - Document ID to delete

**Returns:** Promise that resolves when deletion is complete

**Example:**

```typescript
await db.delete('users', 'a1b2c3d4e5f6g7h8');
```

---

#### `snapshot(): Promise<XDBResponse<void>>`

Triggers a manual point-in-time state snapshot on the server for secure backups.

**Returns:** Promise that resolves when the snapshot is successfully created**

**Example:**

```typescript
const result = await db.snapshot();
if (result.status === 'ok') {
    console.log('Snapshot created successfully.');
}
```

---

#### `close(): Promise<void>`

Gracefully closes the connection to the server.

```typescript
await db.close();
```

### Types

#### `XDBResponse<T>`

```typescript
interface XDBResponse<T = any> {
    status: 'ok' | 'error';
    message: string;
    data?: T;
}
```

#### `XDBAction`

```typescript
type XDBAction = 'insert' | 'find' | 'delete' | 'count' | 'exit';
```

## 💡 Usage Examples

### Type-Safe Operations

```typescript
import { XDBClient } from '@xdb-project/xdb-node';

interface Product {
    name: string;
    price: number;
    inStock: boolean;
}

const db = new XDBClient();

async function productDemo() {
    await db.connect();

    // Insert with type safety
    const product = await db.insert<Product>('products', {
        name: 'Laptop',
        price: 999.99,
        inStock: true,
    });

    console.log(`Product created: ${product.data?._id}`);

    // Find with type inference
    const results = await db.find<Product>('products', { inStock: true });
    results.data?.forEach((item) => {
        console.log(`${item.name}: $${item.price}`);
    });

    await db.close();
}

productDemo().catch(console.error);
```

### Error Handling

```typescript
import { XDBClient } from '@xdb-project/xdb-node';

const db = new XDBClient();

try {
    await db.connect();
} catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
        console.error('XDB server is not running on port 8080.');
        console.error('Please start the XDB server: ./bin/xdb');
    } else {
        console.error('Connection error:', error.message);
    }
}
```

### Batch Operations

```typescript
import { XDBClient } from '@xdb-project/xdb-node';

const db = new XDBClient();
await db.connect();

// Insert multiple documents
const ids = [];
for (const user of userData) {
    const result = await db.insert('users', user);
    if (result.data?._id) {
        ids.push(result.data._id);
    }
}

// Query all inserted documents
const insertedUsers = await db.find('users', {});
console.log(`Inserted ${insertedUsers.data?.length} users`);

await db.close();
```

## 🚨 Error Handling

The driver provides detailed error messages for common issues:

### Connection Errors

```typescript
try {
    await db.connect();
} catch (error) {
    console.error(error);
    // Output if server is down:
    // [ERROR] Could not connect to XDB at localhost:8080
    // [HINT] Is the XDB server running on the default port?
}
```

### Response Errors

```typescript
const result = await db.find('users', {});

if (result.status === 'error') {
    console.error(`Operation failed: ${result.message}`);
}
```

### Query Semantics

- **Exact Matching**: Queries require exact field matches (no regex or partial matching)
- **Null Handling**: Missing fields in documents do not match query filters
- **Pagination**: Use `limit` parameter to control result set size

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

### Writing Tests

```typescript
import { XDBClient } from '../src';

describe('XDBClient', () => {
    let db: XDBClient;

    beforeAll(async () => {
        db = new XDBClient();
        await db.connect();
    });

    afterAll(async () => {
        await db.close();
    });

    it('should insert a document', async () => {
        const result = await db.insert('test', { value: 42 });
        expect(result.status).toBe('ok');
        expect(result.data?._id).toBeDefined();
    });

    it('should find documents', async () => {
        const result = await db.find('test', { value: 42 });
        expect(result.data).toBeInstanceOf(Array);
    });
});
```

## 🗄️ XDB Server Setup

The XDB-Node driver requires a running XDB server listening on port 8080. Follow these steps to set up the backend:

### Prerequisites

| Requirement   | Version | Description                        |
| ------------- | ------- | ---------------------------------- |
| GCC           | 7.0+    | C compiler with C99 support        |
| GNU Make      | 3.81+   | Build automation tool              |
| POSIX Threads | -       | For concurrent connection handling |

### Supported Platforms

- Linux (Ubuntu 20.04+, Debian, Fedora, etc.)
- macOS (with Homebrew-installed GCC)
- Other POSIX-compliant systems

### Installation Steps

#### 1. Clone the XDB Repository

```bash
git clone https://github.com/xdb-project/xdb.git
cd xdb
git submodule update --init --recursive
```

#### 2. Verify Dependencies

Ensure the following files exist:

- `third_party/cJSON/cJSON.h`
- `third_party/cJSON/cJSON.c`

The cJSON library is included in the repository.

#### 3. Compile the Project

```bash
make
```

This command will:

- Create the `bin/` and `data/` directories
- Compile all source files with optimizations
- Link the executable to `bin/xdb`

#### 4. Clean Build Artifacts (Optional)

To remove compiled files and start fresh:

```bash
make clean
```

#### 5. Start the Server

```bash
./bin/xdb
```

The database server will automatically start listening on `0.0.0.0:8080`.

**Expected Output:**

```
Starting XDB Server...

[08:17:43] [INFO] Initialized new database instance.
[08:17:43] [INFO] Server listening on 0.0.0.0:8080
```

Port 8080 is fixed and cannot be changed. Ensure no other services are using this port before starting the server.

#### 6. Run Unit Tests (Optional)

Verify the server is built correctly:

```bash
make test
```

**Expected Output:**

```
XDB Unit Test Suite
[TEST] test_query_exact_match             PASS
[TEST] test_crud_workflow                 PASS
Summary: 2 Run, 0 Failed
```

### Fixed Port Configuration

XDB server is configured to listen exclusively on:

- **Host:** `0.0.0.0` (all interfaces)
- **Port:** `8080` (fixed, non-configurable)

Port customization is not supported. If port 8080 is already in use on your system, you must free it before running the server:

```bash
# Find process using port 8080
lsof -i :8080

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

### XDB API

The XDB server accepts JSON commands over TCP on port 8080. For complete API documentation, see the [API Documentation](https://github.com/xdb-project/xdb#api-documentation) in the XDB repository.

**Quick Reference:**

```bash
# Connect to server
telnet localhost 8080

# Insert a document
{"action": "insert", "collection": "users", "data": {"name": "Alice"}}

# Find documents
{"action": "find", "collection": "users", "query": {"name": "Alice"}}

# Delete a document
{"action": "delete", "collection": "users", "id": "uuid-here"}

# Count documents
{"action": "count", "collection": "users"}

# Snapshot documents
{"action": "snapshot"}

# Close connection
{"action": "exit"}
```

## 🏗️ Architecture

### Design Principles

The XDB-Node driver follows these architectural principles:

1. **Modularity**: Clean separation between connection, request handling, and response parsing
2. **Promise-Based**: Modern async/await support for intuitive control flow
3. **Type Safety**: Full TypeScript support with generic types for compile-time validation
4. **Standardization**: Fixed port 8080 ensures consistent deployments across all environments
5. **Error Resilience**: Graceful handling of network errors with helpful diagnostics

### Project Structure

```
src/
├── index.ts              # Public API exports
├── client.ts             # Main client implementation
└── types/
    └── definitions.ts    # TypeScript type definitions

examples/
└── basic.ts             # Basic usage example

tests/
└── client.spec.ts       # Test suite

dist/                     # Compiled JavaScript output
```

### Component Overview

- **XDBClient**: Main entry point, handles connection to localhost:8080 and API operations
- **Type Definitions**: Strict contracts for requests, responses, and types
- **Stream Handler**: Manages TCP packet buffering and JSON deserialization

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Code Style

- Use TypeScript for all code
- Follow the existing code conventions
- Use 4-space indentation
- Use meaningful variable and function names

### Testing

- Add tests for new features
- Ensure all tests pass before submitting a Pull Request

```bash
npm test
```

### Commits

Use descriptive commit messages following the Conventional Commits specification:

```
feat: Add support for batch operations
fix: Handle connection timeouts gracefully
docs: Update API documentation
test: Add integration tests
refactor: Simplify client initialization
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request with a clear description of changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Resources

- **GitHub Repository**: [github.com/xdb-project/xdb-node](https://github.com/xdb-project/xdb-node)
- **XDB Server**: [github.com/xdb-project/xdb](https://github.com/xdb-project/xdb)
- **npm Package**: [npmjs.com/package/@xdb-project/xdb-node](https://www.npmjs.com/package/@xdb-project/xdb-node)

## 👨‍💻 Maintainers

**XDB-Project Team**  
https://github.com/xdb-project

---

**XDB-Node** © 2026. Maintained by the XDB-Project team.
