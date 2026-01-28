/**
 * @file xdb-client.spec.ts
 * @brief Unit tests for XDBClient using Jest.
 * Covers connection handling, command sending, TCP stream buffering,
 * and specific error scenarios like ECONNREFUSED with the new logging system.
 */

import { XDBClient } from '../src/xdb-client';
import { Socket } from 'net';
import { EventEmitter } from 'events';

// Mocking the 'net' module to prevent actual network calls
jest.mock('net');

describe('XDBClient', () => {
    let client: XDBClient;
    let mockSocket: any;

    beforeEach(() => {
        // Reset mocks before each test to ensure clean state
        jest.clearAllMocks();

        // Create a fake Socket that behaves like an EventEmitter
        mockSocket = new EventEmitter();
        mockSocket.connect = jest.fn((port, host, cb) => {
            // We simulate a connection delay or success manually in tests
            // For most tests, we trigger the callback immediately or via emit
            if (cb) cb();
        });
        mockSocket.write = jest.fn();
        mockSocket.destroy = jest.fn();
        mockSocket.end = jest.fn();

        // Force net.Socket to return our mock instance
        (Socket as unknown as jest.Mock).mockImplementation(() => mockSocket);

        // Initialize client (port is internally fixed to 8080)
        client = new XDBClient();
    });

    /**
     * @test Connection Handling
     * Verifies that the client strictly uses port 8080.
     */
    test('should connect successfully using fixed port 8080', async () => {
        const connectPromise = client.connect();

        // Simulate successful connection event if needed,
        // but our mock calls the callback immediately in this setup.

        await expect(connectPromise).resolves.toBeUndefined();

        // Assert that 8080 was used regardless of defaults
        expect(mockSocket.connect).toHaveBeenCalledWith(8080, '127.0.0.1', expect.any(Function));
    });

    /**
     * @test Connection Refused (Server Down)
     * Verifies that the client splits the error into a specific ERROR and WARN log.
     */
    test('should handle ECONNREFUSED and log helpful hints via standardized logger', async () => {
        // 1. Spy on console.error AND console.log (since WARN uses console.log in your utils)
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // 2. Override the socket mock to NOT call the callback
        mockSocket.connect = jest.fn((port, host, cb) => {
            setImmediate(() => {
                const error: any = new Error('connect ECONNREFUSED 127.0.0.1:8080');
                error.code = 'ECONNREFUSED';
                mockSocket.emit('error', error);
            });
        });

        // 3. Initiate connection
        const promise = client.connect();

        // 4. Assertions
        await expect(promise).rejects.toThrow('connect ECONNREFUSED');

        // Check for the specific formatted logs defined in XDBClient.log()

        // The ERROR log (Red)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to connect to host'));

        // The WARN log (Yellow) - Note: Your LogLevel.WARN uses console.log
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Hint: Is the XDB server running?')
        );

        // Restore console functionality
        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    /**
     * @test Standard Command Execution
     */
    test('should send a command and parse the response', async () => {
        // Suppress info logs during this test
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await client.connect();

        const mockResponse = { status: 'ok', message: 'Document Inserted', data: { _id: '123' } };

        // Setup the promise for the insert command
        const promise = client.insert('users', { name: 'Test' });

        // Simulate server sending data back
        mockSocket.emit('data', Buffer.from(JSON.stringify(mockResponse) + '\n'));

        const result = await promise;

        expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"action":"insert"'));
        expect(result).toEqual(mockResponse);

        logSpy.mockRestore();
    });

    /**
     * @test TCP Stream Buffering (Fragmentation)
     * Critical test: Ensures split packets are reassembled correctly.
     */
    test('should handle split TCP packets (buffering)', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        await client.connect();

        const mockResponse = { status: 'ok', data: { count: 5 } };
        const jsonString = JSON.stringify(mockResponse) + '\n';

        // Split the JSON into two chunks
        const part1 = jsonString.substring(0, 10);
        const part2 = jsonString.substring(10);

        const promise = client.count('users');

        // Emit first chunk (should not resolve yet)
        mockSocket.emit('data', Buffer.from(part1));

        // Emit second chunk (should trigger resolve)
        mockSocket.emit('data', Buffer.from(part2));

        const result = await promise;
        expect(result).toEqual(mockResponse);
        logSpy.mockRestore();
    });

    /**
     * @test Multiple Responses in One Packet
     * Simulates receiving two JSON objects in a single 'data' event.
     */
    test('should handle multiple responses in a single packet', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        await client.connect();

        const res1 = { status: 'ok', id: 1 };
        const res2 = { status: 'ok', id: 2 };

        // Queue two commands
        const p1 = client.find('users');
        const p2 = client.find('admins');

        // Server sends both responses concatenated
        const payload = JSON.stringify(res1) + '\n' + JSON.stringify(res2) + '\n';
        mockSocket.emit('data', Buffer.from(payload));

        await expect(p1).resolves.toEqual(res1);
        await expect(p2).resolves.toEqual(res2);
        logSpy.mockRestore();
    });

    /**
     * @test Malformed JSON Handling
     */
    test('should log error and reject on invalid JSON', async () => {
        // Suppress logs for cleaner test output
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await client.connect();

        const promise = client.find('users');

        // Simulate malformed data
        mockSocket.emit('data', Buffer.from('INVALID_JSON\n'));

        await expect(promise).rejects.toThrow(/Malformed JSON/);

        // Verify that the logger caught the protocol violation
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Protocol violation: Malformed JSON')
        );

        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    /**
     * @test Socket Error Handling
     */
    test('should reject pending commands on connection error', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await client.connect();

        const promise = client.find('users');
        const error = new Error('Connection Reset');

        mockSocket.emit('error', error);

        await expect(promise).rejects.toEqual(error);

        // Verify generic error logging
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Socket error occurred'));

        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
