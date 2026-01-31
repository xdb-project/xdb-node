/**
 * @file tests/xdb-client.spec.ts
 * @brief Ultra-comprehensive Unit Tests for XDB-Node.
 * This suite ensures 100% functional reliability of the TCP client,
 * covering the entire CRUD cycle, protocol integrity, and error resiliency.
 */

import { XDBClient } from '../src/xdb-client';
import { Socket } from 'net';
import { EventEmitter } from 'events';

// Mocking 'net' module to isolate the client logic from actual OS networking.
jest.mock('net');

describe('XDBClient - Full Protocol & Logic Validation', () => {
    let client: XDBClient;
    let mockSocket: any;

    beforeEach(() => {
        // Clear all mock history and active timers before each test case.
        jest.clearAllMocks();

        // Initialize a mock socket that inherits EventEmitter capabilities.
        mockSocket = new EventEmitter();
        mockSocket.connect = jest.fn((port, host, cb) => {
            // Simulate immediate connection success.
            if (cb) cb();
        });
        mockSocket.write = jest.fn();
        mockSocket.destroy = jest.fn();
        mockSocket.end = jest.fn();

        // Inject our mock instance into the net.Socket constructor.
        (Socket as unknown as jest.Mock).mockImplementation(() => mockSocket);

        // Client initialization (Defaulting to localhost:8080).
        client = new XDBClient();
    });

    /**
     * @test Connection Success
     * Ensures the client uses the correct fixed port and host.
     */
    test('should establish a TCP handshake on port 8080', async () => {
        const connectPromise = client.connect();
        await expect(connectPromise).resolves.toBeUndefined();
        expect(mockSocket.connect).toHaveBeenCalledWith(8080, '127.0.0.1', expect.any(Function));
    });

    /**
     * @test Connection Failure (ECONNREFUSED)
     * Verifies that the client provides helpful diagnostics when the server is offline.
     */
    test('should provide hints when server connection is refused', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        mockSocket.connect = jest.fn((port, host, cb) => {
            setImmediate(() => {
                const error: any = new Error('ECONNREFUSED');
                error.code = 'ECONNREFUSED';
                mockSocket.emit('error', error);
            });
        });

        await expect(client.connect()).rejects.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to connect'));

        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    /**
     * @test Insert Operation
     * Validates JSON serialization and response mapping for new records.
     */
    test('should perform document insertion', async () => {
        await client.connect();
        const mockRes = { status: 'ok', data: { _id: '1', name: 'XDB' } };

        const promise = client.insert('users', { name: 'XDB' });
        mockSocket.emit('data', Buffer.from(JSON.stringify(mockRes) + '\n'));

        const res = await promise;
        // Fix TS18048 using non-null assertion as we control the mock
        expect(res.data!._id).toBe('1');
        expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"action":"insert"'));
    });

    /**
     * @test Find Operation
     * Validates query filtering and array-based response handling.
     */
    test('should perform document retrieval (find)', async () => {
        await client.connect();
        const mockRes = { status: 'ok', data: [{ _id: '1' }, { _id: '2' }] };

        const promise = client.find('users', { active: true }, 10);
        mockSocket.emit('data', Buffer.from(JSON.stringify(mockRes) + '\n'));

        const res = await promise;
        expect(res.data).toHaveLength(2);
        expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"limit":10'));
    });

    /**
     * @test Update Operation (Selective Merge)
     * Verifies that partial updates are correctly formatted with the target ID.
     */
    test('should perform selective field merging (update)', async () => {
        await client.connect();
        const mockRes = { status: 'ok', message: 'Updated' };

        const promise = client.update('users', 'id123', { status: 'online' });
        mockSocket.emit('data', Buffer.from(JSON.stringify(mockRes) + '\n'));

        const res = await promise;
        const payload = JSON.parse(mockSocket.write.mock.calls[0][0]);
        expect(payload.id).toBe('id123');
        expect(payload.data.status).toBe('online');
    });

    /**
     * @test Upsert Operation
     * Checks if the upsert action is handled as a single atomic command.
     */
    test('should perform update-or-insert (upsert)', async () => {
        await client.connect();
        const mockRes = { status: 'ok', message: 'Upserted' };

        const promise = client.upsert('users', 'id123', { points: 50 });
        mockSocket.emit('data', Buffer.from(JSON.stringify(mockRes) + '\n'));

        await promise;
        expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"action":"upsert"'));
    });

    /**
     * @test Delete Operation
     * Verifies that deletion only requires a collection and a target ID.
     */
    test('should perform document deletion', async () => {
        await client.connect();
        const mockRes = { status: 'ok', message: 'Deleted' };

        const promise = client.delete('users', 'id123');
        mockSocket.emit('data', Buffer.from(JSON.stringify(mockRes) + '\n'));

        const res = await promise;
        expect(res.status).toBe('ok');
    });

    /**
     * @test Count Operation
     * Ensures count action returns the expected integer value from the server.
     */
    test('should perform collection counting', async () => {
        await client.connect();
        const mockRes = { status: 'ok', data: { count: 42 } };

        const promise = client.count('users');
        mockSocket.emit('data', Buffer.from(JSON.stringify(mockRes) + '\n'));

        const res = await promise;
        expect(res.data!.count).toBe(42);
    });

    /**
     * @test Snapshot Operation
     * Verifies server-side persistence trigger.
     */
    test('should trigger server-side snapshot', async () => {
        await client.connect();
        const mockRes = { status: 'ok', message: 'Snapshot saved' };

        const promise = client.snapshot();
        mockSocket.emit('data', Buffer.from(JSON.stringify(mockRes) + '\n'));

        const res = await promise;
        expect(res.status).toBe('ok');
    });

    /**
     * @test TCP Fragmentation Handling
     * Critical test for reassembling data that arrives in multiple chunks.
     */
    test('should reassemble split TCP packets', async () => {
        await client.connect();
        const mockRes = { status: 'ok', message: 'Success' };
        const raw = JSON.stringify(mockRes) + '\n';

        const p1 = raw.slice(0, 10);
        const p2 = raw.slice(10);

        const promise = client.snapshot();
        mockSocket.emit('data', Buffer.from(p1));
        mockSocket.emit('data', Buffer.from(p2));

        const res = await promise;
        expect(res.message).toBe('Success');
    });

    /**
     * @test Multiple Commands Sequencing
     * Verifies that the internal ResponseResolver queue correctly maps
     * responses to their respective Promises in order.
     */
    test('should handle multiple overlapping requests correctly', async () => {
        await client.connect();

        const p1 = client.count('users');
        const p2 = client.count('logs');

        mockSocket.emit('data', Buffer.from(JSON.stringify({ data: { count: 10 } }) + '\n'));
        mockSocket.emit('data', Buffer.from(JSON.stringify({ data: { count: 20 } }) + '\n'));

        const [res1, res2] = await Promise.all([p1, p2]);
        // Fix TS18048 by asserting existence of data property
        expect(res1.data!.count).toBe(10);
        expect(res2.data!.count).toBe(20);
    });

    /**
     * @test Malformed JSON Handling
     * Verifies the client rejects when the server violates the JSON protocol.
     */
    test('should reject malformed JSON from server', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await client.connect();

        const promise = client.snapshot();
        mockSocket.emit('data', Buffer.from('NOT_JSON_DATA\n'));

        await expect(promise).rejects.toThrow('Malformed JSON');
        errorSpy.mockRestore();
    });

    /**
     * @test Graceful Exit
     * Verifies the exit handshake and socket termination.
     */
    test('should close the connection cleanly', async () => {
        await client.connect();
        const exitPromise = client.close();

        mockSocket.emit('data', Buffer.from(JSON.stringify({ status: 'ok' }) + '\n'));
        await exitPromise;

        expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('"action":"exit"'));
        expect(mockSocket.end).toHaveBeenCalled();
    });
});
