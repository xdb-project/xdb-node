/**
 * @file definitions.ts
 * @brief Core type definitions and interfaces for XDB-Node.
 * Defines the contract for requests, responses, and internal queue handling.
 */

/**
 * @brief Supported actions by the XDB Server.
 */
export type XDBAction = 'insert' | 'find' | 'delete' | 'count' | 'snapshot' | 'exit';

/**
 * @brief Configuration options for the client connection.
 * @note Port is now internally fixed to 8080 in the client implementation.
 */
export interface XDBConnectionOptions {
    host?: string;
}

/**
 * @brief Standard request structure sent to the C server.
 */
export interface XDBRequest {
    action: XDBAction;
    collection?: string;
    data?: Record<string, any>;
    query?: Record<string, any>;
    limit?: number;
    id?: string;
}

/**
 * @brief Standard response structure received from the C server.
 * @template T The type of data expected in the response.
 */
export interface XDBResponse<T = any> {
    status: 'ok' | 'error';
    message: string;
    data?: T;
}

/**
 * @brief Internal interface for managing the Promise queue.
 * Used to map asynchronous server responses back to the correct caller.
 */
export interface ResponseResolver {
    resolve: (value: XDBResponse<any> | PromiseLike<XDBResponse<any>>) => void;
    reject: (reason?: any) => void;
}
