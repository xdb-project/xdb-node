/**
 * @file app.ts
 * @brief Example usage script for the XDB-Node.
 * Demonstrates connection, CRUD operations (including Update/Upsert),
 * snapshotting, and type safety.
 */

import { XDBClient } from '../src';

interface User {
    username: string;
    email: string;
    active: boolean;
    score?: number; // Optional field for upsert/update demo
}

async function main() {
    // Port is fixed to 8080 internally.
    // Use { host: '192.168.x.x' } only if connecting to a remote server.
    const db = new XDBClient();

    try {
        await db.connect();

        // 1. Insert Data (Type Safe)
        console.log('\n1. Insert Data');
        const newDoc = await db.insert<User>('users', {
            username: 'typescript_user',
            email: 'ts@example.com',
            active: true,
        });

        const targetId = newDoc.data?._id || 'unknown';
        if (newDoc.status === 'ok') {
            console.log(`Success! Created ID: ${targetId}`);
        }

        // 2. Update Data (Selective Merge)
        // Modifies only specified fields without affecting others.
        console.log('\n2. Update Data (Selective Merge)');
        const updateRes = await db.update<User>('users', targetId, {
            active: false,
        });
        if (updateRes.status === 'ok') {
            console.log(`Updated user ${targetId}: active is now false.`);
        }

        // 3. Upsert Data (Update or Insert)
        // If ID exists, it updates; if not, it creates a new entry.
        console.log('\n3. Upsert Data');
        const upsertRes = await db.upsert<User>('users', targetId, {
            score: 100,
        });
        if (upsertRes.status === 'ok') {
            console.log(`Upsert successful for ID: ${targetId}`);
        }

        // 4. Find Data
        console.log('\n4. Find Data');
        const users = await db.find<User>('users', { active: false });
        console.log(`Found ${users.data?.length} users matching criteria.`);

        // 5. Count Data
        console.log('\n5. Count Data');
        const count = await db.count('users');
        console.log(`Total documents in 'users': ${count.data?.count}`);

        // 6. Database Snapshot
        console.log('\n6. Create Snapshot');
        const snapshot = await db.snapshot();
        if (snapshot.status === 'ok') {
            console.log('Point-in-time snapshot created successfully on server.');
        }

        // 7. Cleanup
        console.log('\n7. Cleanup');
        await db.close();
    } catch (error) {
        console.error('\n[FATAL] An error occurred during execution:', error);
    }
}

main();
