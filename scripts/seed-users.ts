import 'dotenv/config';
import { db } from '../src/lib/db';
import { userDB } from '../src/lib/schema';
import bcrypt from 'bcryptjs';
import { inArray } from 'drizzle-orm';

/**
 * Seed users for development/demo purposes
 * ADR 0002: Demo users have mustChangePassword = false for convenience
 */
async function seedUsers() {
    console.log('🌱 Seeding users...\n');

    // Remove old placeholder accounts
    const oldEmails = ['admin@homa.com', 'owner@homa.com', 'staff@homa.com'];
    await db.delete(userDB).where(inArray(userDB.email, oldEmails));
    console.log('🗑️  Removed old placeholder accounts\n');

    const users = [
        {
            email: 'handi.docss@gmail.com',
            password: 'handiHoma2026!',
            role: 'ADMIN' as const,
            mustChangePassword: false,
        },
        {
            email: 'christian@homa.co.id',
            password: 'imsHoma2026!',
            role: 'OWNER' as const,
            mustChangePassword: false,
        },
        {
            email: 'dara@homa.co.id',
            password: 'daraHoma2026!',
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

    console.log('\n🎉 Users seeded successfully!');
    console.log('\nYou can now login with:');
    console.log('  - handi.docss@gmail.com / handiHoma2026! (ADMIN)');
    console.log('  - christian@homa.co.id / imsHoma2026! (OWNER)');
    console.log('  - dara@homa.co.id / daraHoma2026! (STAFF)');

    process.exit(0);
}

seedUsers().catch(console.error);
