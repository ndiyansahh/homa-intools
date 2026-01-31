import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createUser } from '@/lib/users';
import { logAuthEvent } from '@/lib/logger';
import { CreateUserRequest, CreateUserResponse } from '@/types/auth';
import { db } from '@/lib/db';
import { userDB } from '@/lib/schema';

// Demo users fallback (when database not migrated)
const DEMO_USERS = [
    { id: 'demo-admin', email: 'admin@homa.com', role: 'ADMIN', mustChangePassword: false, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'demo-owner', email: 'owner@homa.com', role: 'OWNER', mustChangePassword: false, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'demo-staff', email: 'staff@homa.com', role: 'STAFF', mustChangePassword: false, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// GET: List all users (Admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        }

        try {
            const users = await db
                .select({
                    id: userDB.id,
                    email: userDB.email,
                    role: userDB.role,
                    mustChangePassword: userDB.mustChangePassword,
                    isActive: userDB.isActive,
                    createdAt: userDB.createdAt,
                    updatedAt: userDB.updatedAt,
                })
                .from(userDB)
                .orderBy(userDB.createdAt);

            return NextResponse.json({ users });
        } catch (dbError) {
            console.error('Database error, returning demo users:', dbError);
            return NextResponse.json({ users: DEMO_USERS });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// POST: Admin creates a new user (ADR 0002)
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // RBAC: Only ADMIN can create users (ADR 0002)
        if (session.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, message: 'Forbidden - Admin only' },
                { status: 403 }
            );
        }

        const body: CreateUserRequest = await request.json();
        const { email, password, role } = body;

        // Validate required fields
        if (!email || !password || !role) {
            return NextResponse.json(
                { success: false, message: 'Email, password, and role are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, message: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Validate role
        if (!['ADMIN', 'OWNER', 'STAFF'].includes(role)) {
            return NextResponse.json(
                { success: false, message: 'Role must be ADMIN, OWNER, or STAFF' },
                { status: 400 }
            );
        }

        // Validate password strength (temporary password, still needs some requirements)
        if (password.length < 6) {
            return NextResponse.json(
                { success: false, message: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Create user in database
        const newUser = await createUser(email, password, role);

        if (!newUser) {
            return NextResponse.json(
                { success: false, message: 'Failed to create user - email may already exist' },
                { status: 400 }
            );
        }

        logAuthEvent({
            action: 'user_created',
            userId: session.userId,
            email: session.email,
            details: {
                success: true,
                createdUserId: newUser.id,
                createdUserEmail: newUser.email,
                createdUserRole: newUser.role,
            },
        });

        const response: CreateUserResponse = {
            success: true,
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
                mustChangePassword: newUser.mustChangePassword,
            },
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error) {
        console.error('Create user API error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to create user' },
            { status: 500 }
        );
    }
}
