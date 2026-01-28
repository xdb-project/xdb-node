/**
 * @file xdb-client.spec.ts
 * @brief Unit tests for XDBClient using Jest.
 * Covers connection handling, command sending, TCP stream buffering,
 * snapshotting, and specific error scenarios like ECONNREFUSED.
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
        await expect(connectPromise).resolves.toBeUndefined();
        expect(mockSocket.connect).toHaveBeenCalledWith(8080, '127.0.0.1', expect.any(Function));
    });

    /**
     * @test Connection Refused (Server Down)
     */
    test('should handle ECONNREFUSED and log helpful hints via standardized logger', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        mockSocket.connect = jest.fn((port, host, cb) => {
            setImmediate(() => {
                const error: any = new Error('connect ECONNREFUSED 127.0.0.1:8080');
                error.code = 'ECONNREFUSED';
                mockSocket.emit('error', error);
            });
        });

        const promise = client.connect();
        await expect(promise).rejects.toThrow('connect ECONNREFUSED');

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to connect to host'));
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Hint: Is the XDB server running?')
        );

        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    /**
     * @test Standard Command Execution
     */
    test('should send a command and parse the response', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        await client.connect();

        const mockResponse = { status: 'ok', message: 'Document Inserted', data: { _id: '123' } };
        const promise = client.insert('users', { name: 'Test' });

        mockSocket.emit('data', Buffer.from(JSON.stringify(mockResponse) + '\n'));

        const result = await promise;
        expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"action":"insert"'));
        expect(result).toEqual(mockResponse);
        logSpy.mockRestore();
    });

    /**
     * @test Database Snapshotting
     */
    test('should trigger a database snapshot and receive success status', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        await client.connect();

        const mockResponse = { status: 'ok', message: 'Snapshot created successfully' };
        const promise = client.snapshot();

        mockSocket.emit('data', Buffer.from(JSON.stringify(mockResponse) + '\n'));

        const result = await promise;
        expect(mockSocket.write).toHaveBeenCalledWith(
            expect.stringContaining('"action":"snapshot"')
        );
        expect(result).toEqual(mockResponse);
        logSpy.mockRestore();
    });

    /**
     * @test TCP Stream Buffering (Fragmentation)
     */
    test('should handle split TCP packets (buffering)', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        await client.connect();

        const mockResponse = { status: 'ok', data: { count: 5 } };
        const jsonString = JSON.stringify(mockResponse) + '\n';
        const part1 = jsonString.substring(0, 10);
        const part2 = jsonString.substring(10);

        const promise = client.count('users');
        mockSocket.emit('data', Buffer.from(part1));
        mockSocket.emit('data', Buffer.from(part2));

        const result = await promise;
        expect(result).toEqual(mockResponse);
        logSpy.mockRestore();
    });

    /**
     * @test Multiple Responses in One Packet
     */
    test('should handle multiple responses in a single packet', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        await client.connect();

        const res1 = { status: 'ok', id: 1 };
        const res2 = { status: 'ok', id: 2 };

        const p1 = client.find('users');
        const p2 = client.find('admins');

        const payload = JSON.stringify(res1) + '\n' + JSON.stringify(res2) + '\n';
        mockSocket.emit('data', Buffer.from(payload));

        await expect(p1).resolves.toEqual(res1);
        await expect(p2).resolves.toEqual(res2);
        logSpy.mockRestore();
    });

    /**
     * @test Graceful Session Termination
     * Verifies that close() sends an exit action and ends the socket.
     */
    test('should terminate session gracefully and close socket', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        await client.connect();

        const closePromise = client.close();

        // Server acknowledges the exit command
        mockSocket.emit('data', Buffer.from(JSON.stringify({ status: 'ok' }) + '\n'));

        await closePromise;

        expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"action":"exit"'));
        expect(mockSocket.end).toHaveBeenCalled();
        // @ts-ignore
        expect(client.isConnected).toBe(true); // isConnected is true during close sequence until socket event

        logSpy.mockRestore();
    });

    /**
     * @test Malformed JSON Handling
     */
    test('should log error and reject on invalid JSON', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await client.connect();
        const promise = client.find('users');

        mockSocket.emit('data', Buffer.from('INVALID_JSON\n'));

        await expect(promise).rejects.toThrow(/Malformed JSON/);
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
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
