/**
 * @file xdb-client.ts
 * @brief Main Implementation of the XDB-Node.
 * Handles TCP persistence, stream buffering, command dispatching,
 * and user-friendly error reporting with standardized logging.
 */

import * as net from 'net';
import {
    XDBRequest,
    XDBResponse,
    XDBConnectionOptions,
    ResponseResolver,
} from './types/definitions';

// CONSTANTS
const DEFAULT_HOST = '127.0.0.1';
const FIXED_PORT = 8080;

// LOGGING UTILS
enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

/**
 * @class XDBClient
 * @brief A persistent TCP client for interacting with the XDB Server.
 * Encapsulates the raw socket operations and provides a Promise-based API.
 */
export class XDBClient {
    private socket: net.Socket;
    private isConnected: boolean = false;
    private responseQueue: ResponseResolver[] = [];
    private streamBuffer: string = '';

    private readonly host: string;
    private readonly port: number;

    /**
     * @brief Initializes the XDB Client instance.
     * @note The port is strictly fixed to 8080 and cannot be changed via options.
     * @param options Configuration object (only host is configurable).
     */
    constructor(options: XDBConnectionOptions = {}) {
        this.host = options.host || DEFAULT_HOST;
        this.port = FIXED_PORT;
        this.socket = new net.Socket();
    }

    /**
     * @brief Internal logger helper to ensure consistent log formatting.
     * Format: [ISO-Time] [Level] [XDB-Client] Message
     */
    private log(level: LogLevel, message: string, details?: any): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}]`;
        const context = `[XDB-Client]`;

        const colors = {
            reset: '\x1b[0m',
            info: '\x1b[36m', // Cyan
            warn: '\x1b[33m', // Yellow
            error: '\x1b[31m', // Red
            gray: '\x1b[90m', // Gray for metadata
        };

        let color = colors.info;
        if (level === LogLevel.WARN) color = colors.warn;
        if (level === LogLevel.ERROR) color = colors.error;

        const formattedLog = `${colors.gray}${prefix}${colors.reset} ${color}[${level}]${colors.reset} ${colors.gray}${context}${colors.reset} ${message}`;

        if (level === LogLevel.ERROR) {
            console.error(formattedLog);
            if (details) console.error(details);
        } else {
            console.log(formattedLog);
            if (details) console.log(details);
        }
    }

    /**
     * @brief Establishes a connection to the XDB Server.
     * * Sets up event listeners for data streaming and error handling.
     * * Checks for 'ECONNREFUSED' to provide a helpful hint if the server is down.
     * * @returns Promise<void> Resolves when connection is successful.
     */
    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.connect(this.port, this.host, () => {
                this.isConnected = true;
                this.log(LogLevel.INFO, `Connection established to ${this.host}:${this.port}`);
                resolve();
            });

            // Handle incoming data stream
            this.socket.on('data', (chunk: Buffer) => {
                this.handleStreamData(chunk.toString());
            });

            // Handle socket errors
            this.socket.on('error', (err: any) => {
                this.isConnected = false;

                // Check if the connection was refused (Server not running)
                if (err.code === 'ECONNREFUSED') {
                    this.log(LogLevel.ERROR, `Failed to connect to host ${this.host}:${this.port}`);
                    this.log(
                        LogLevel.WARN,
                        `Hint: Is the XDB server running? Try starting it with './bin/server'`
                    );
                } else {
                    this.log(LogLevel.ERROR, `Socket error occurred: ${err.message}`);
                }

                // If it's a connection error during init, reject the promise
                if (this.responseQueue.length === 0) {
                    reject(err);
                } else {
                    // Otherwise, reject the current pending command
                    const resolver = this.responseQueue.shift();
                    if (resolver) resolver.reject(err);
                }
            });

            this.socket.on('close', () => {
                this.isConnected = false;
                // Only log explicit closure if needed for debugging
                // this.log(LogLevel.INFO, 'Connection closed.');
            });
        });
    }

    /**
     * @brief Processes raw TCP stream data.
     * * Splits the stream by newline characters to reconstruct distinct JSON objects.
     * * Handles packet fragmentation (partial JSONs) by buffering incomplete data.
     * @param chunk Raw string data from the socket.
     */
    private handleStreamData(chunk: string): void {
        this.streamBuffer += chunk;

        // Split by newline (the protocol delimiter)
        const lines = this.streamBuffer.split('\n');

        // The last element is either an empty string (if exact split)
        // or an incomplete JSON fragment. Keep it in the buffer.
        this.streamBuffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim() === '') continue;

            const resolver = this.responseQueue.shift();
            if (resolver) {
                try {
                    const json: XDBResponse = JSON.parse(line);
                    resolver.resolve(json);
                } catch (error) {
                    this.log(LogLevel.ERROR, `Protocol violation: Malformed JSON received.`, {
                        raw: line,
                    });
                    resolver.reject(new Error(`Critical: Malformed JSON received.`));
                }
            }
        }
    }

    /**
     * @brief Internal helper to send commands to the server.
     * * Wraps the request in a Promise and pushes the resolver to the queue.
     * @param payload The request object.
     * @returns Promise<XDBResponse<T>> The server's response.
     */
    private sendCommand<T>(payload: XDBRequest): Promise<XDBResponse<T>> {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                return reject(new Error('Client is not connected to XDB Server.'));
            }

            this.responseQueue.push({ resolve, reject });

            // Append newline as required by the server's protocol
            const message = JSON.stringify(payload) + '\n';
            this.socket.write(message);
        });
    }

    // Public API Methods

    /**
     * @brief Inserts a document into a specific collection.
     * @param collection Target collection name.
     * @param data JSON object to insert.
     */
    public async insert<T extends Record<string, any> = Record<string, any>>(
        collection: string,
        data: T
    ): Promise<XDBResponse<T & { _id: string }>> {
        return this.sendCommand({ action: 'insert', collection, data });
    }

    /**
     * @brief Finds documents matching a query filter.
     * @param collection Target collection name.
     * @param query Filter criteria (default: match all).
     * @param limit Max number of results (0 for unlimited).
     */
    public async find<T extends Record<string, any> = Record<string, any>>(
        collection: string,
        query: object = {},
        limit: number = 0
    ): Promise<XDBResponse<T[]>> {
        return this.sendCommand({ action: 'find', collection, query, limit });
    }

    /**
     * @brief Deletes a document by its ID.
     * @param collection Target collection name.
     * @param id The unique _id string of the document.
     */
    public async delete(collection: string, id: string): Promise<XDBResponse<null>> {
        return this.sendCommand({ action: 'delete', collection, id });
    }

    /**
     * @brief Counts the total number of documents in a collection.
     * @param collection Target collection name.
     */
    public async count(collection: string): Promise<XDBResponse<{ count: number }>> {
        return this.sendCommand({ action: 'count', collection });
    }

    /**
     * @brief Terminates the session and closes the socket.
     */
    public async close(): Promise<void> {
        if (this.isConnected) {
            await this.sendCommand({ action: 'exit' });
            this.socket.end();
            this.log(LogLevel.INFO, 'Session terminated gracefully.');
        }
    }
}
