/**
 * @file jest.config.ts
 * @brief Jest configuration for XDB-Node.
 * Defines test environment, root directories, and coverage settings.
 */

import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    // Define the root directory for tests
    roots: ['<rootDir>/tests'],
    // Enable code coverage reporting
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/node_modules/', '/examples/', '/dist/'],
};

module.exports = config;
