import 'dotenv/config';
import { db } from '../src/lib/db';
import { userDB } from '../src/lib/schema';
import bcrypt from 'bcryptjs';

/**
 * Seed users for development/demo purposes
 * ADR 0002: Demo users have mustChangePassword = false for convenience
 */
async function seedUsers() {
    console.log('🌱 Seeding demo users...\n');

    const users = [
        {
            email: 'admin@homa.com',
            password: 'admin123',
            role: 'ADMIN' as const,
            mustChangePassword: false, // Demo: no forced change
        },
        {
            email: 'owner@homa.com',
            password: 'owner123',
            role: 'OWNER' as const,
            mustChangePassword: false,
        },
        {
            email: 'staff@homa.com',
            password: 'staff123',
            role: 'STAFF' as const,
            mustChangePassword: false,
        },
    ];

    for (const user of users) {
        try {
            const passwordHash = await bcrypt.hash(user.password, 10);

            // Upsert: insert or update on conflict
            await db
                .insert(userDB)
                .values({
                    email: user.email,
                    passwordHash,
                    role: user.role,
                    mustChangePassword: user.mustChangePassword,
                    failedLoginAttempts: 0,
                    isActive: true,
                })
                .onConflictDoUpdate({
                    target: userDB.email,
                    set: {
                        passwordHash,
                        role: user.role,
                        mustChangePassword: user.mustChangePassword,
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                        isActive: true,
                        updatedAt: new Date(),
                    },
                });

            console.log(`✅ ${user.role.padEnd(6)} | ${user.email} | ${user.password}`);
        } catch (error) {
            console.error(`❌ Failed to seed ${user.email}:`, error);
        }
    }

    console.log('\n🎉 Demo users seeded successfully!');
    console.log('\nYou can now login with:');
    console.log('  - admin@homa.com / admin123 (ADMIN)');
    console.log('  - owner@homa.com / owner123 (OWNER)');
    console.log('  - staff@homa.com / staff123 (STAFF)');

    process.exit(0);
}

seedUsers().catch(console.error);
