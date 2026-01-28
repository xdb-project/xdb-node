/**
 * @file app.ts
 * @brief Example usage script for the XDB-Node.
 * Demonstrates connection, CRUD operations, snapshotting, and type safety.
 */

import { XDBClient } from '../src';

interface User {
    username: string;
    email: string;
    active: boolean;
}

async function main() {
    // Use { host: '192.168.x.x' } only if connecting to a remote server.
    const db = new XDBClient();

    try {
        await db.connect();

        // 1. Insert Data (Type Safe)
        console.log('\n1. Insert Data');
        const newDoc = await db.insert<User>('users', {
            username: 'typescript',
            email: 'ts@example.com',
            active: true,
        });

        if (newDoc.status === 'ok' && newDoc.data) {
            console.log(`Success! Created ID: ${newDoc.data._id}`);
        }

        // 2. Find Data
        console.log('\n2. Find Data');
        const users = await db.find<User>('users', { active: true });
        console.log(`Found ${users.data?.length} active users.`);

        // 3. Count
        console.log('\n3. Count Data');
        const count = await db.count('users');
        console.log(`Total Count: ${count.data?.count}`);

        // 4. Database Snapshot
        console.log('\n4. Create Snapshot');
        const snapshot = await db.snapshot();
        if (snapshot.status === 'ok') {
            console.log('Snapshot created successfully on server.');
        }

        // 5. Cleanup
        console.log('\n5. Cleanup');
        await db.close();
    } catch (error) {
        console.error('\n[FATAL] An error occurred during execution:', error);
    }
}

main();
