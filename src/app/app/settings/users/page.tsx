'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import SimpleModal from '@/components/simple-modal';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/confirm-dialog';

interface User {
    id: string;
    email: string;
    role: 'ADMIN' | 'OWNER' | 'STAFF';
    mustChangePassword: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function UserManagementPage() {
    const { toast } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form states
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'ADMIN' | 'OWNER' | 'STAFF'>('STAFF');
    const [resetPassword, setResetPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch users
    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/auth/users');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Database not migrated yet');
            // Set demo users as fallback
            setUsers([
                { id: 'demo-admin', email: 'admin@homa.com', role: 'ADMIN', mustChangePassword: false, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                { id: 'demo-owner', email: 'owner@homa.com', role: 'OWNER', mustChangePassword: false, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                { id: 'demo-staff', email: 'staff@homa.com', role: 'STAFF', mustChangePassword: false, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Create user
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSuccessMessage(null);

        if (!newEmail || !newPassword) {
            setFormError('Email and password are required');
            return;
        }

        if (newPassword.length < 8) {
            setFormError('Password must be at least 8 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/auth/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    role: newRole,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to create user');
            }

            // Reset form
            setNewEmail('');
            setNewPassword('');
            setNewRole('STAFF');
            setShowCreateModal(false);
            setSuccessMessage(`User ${newEmail} created successfully`);

            // Refresh users list
            fetchUsers();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setFormError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !resetPassword) return;

        setFormError(null);

        if (resetPassword.length < 8) {
            setFormError('Password must be at least 8 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/auth/users/${selectedUser.id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: resetPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setResetPassword('');
            setShowResetPasswordModal(false);
            setSelectedUser(null);
            setSuccessMessage(`Password reset for ${selectedUser.email}`);
            fetchUsers();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setFormError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete user
    const handleDeleteUser = async (user: User) => {
        const ok = await confirm({ title: 'Delete User', message: `Delete ${user.email}? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
        if (!ok) return;

        try {
            const response = await fetch(`/api/auth/users/${user.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete user');
            }

            setSuccessMessage(`User ${user.email} deleted`);
            fetchUsers();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            toast('error', errorMessage);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-red-100 text-red-800';
            case 'OWNER':
                return 'bg-blue-100 text-blue-800';
            case 'STAFF':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="h-full">
            <div className="mb-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <Link
                        href="/app/settings"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Icons.chevronLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">User Accounts</h1>
                        <p className="text-sm text-gray-600">
                            Manage user accounts, roles, and access permissions
                        </p>
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                        <p className="text-sm text-green-800">{successMessage}</p>
                        <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
                            <Icons.close className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-yellow-800">
                            {error}. Showing demo data. Run migration to enable full functionality.
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={fetchUsers}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <Icons.refresh className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                        <Icons.plus className="h-4 w-4 mr-2" />
                        Add User
                    </button>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center">
                                            <Icons.spinner className="h-6 w-6 animate-spin text-gray-400" />
                                            <span className="ml-2 text-gray-500">Loading users...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-900">{user.email}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.mustChangePassword ? (
                                                <span className="text-xs text-orange-600 font-medium">Must change</span>
                                            ) : (
                                                <span className="text-xs text-gray-500">Set</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setFormError(null);
                                                        setShowResetPasswordModal(true);
                                                    }}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                    title="Reset Password"
                                                >
                                                    <Icons.key className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    disabled={user.id.startsWith('demo-')}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Delete User"
                                                >
                                                    <Icons.trash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            <SimpleModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setFormError(null);
                    setNewEmail('');
                    setNewPassword('');
                    setNewRole('STAFF');
                }}
                title="Add New User"
                size="sm"
            >
                <form onSubmit={handleCreateUser} className="space-y-4">
                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="user@homa.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Temporary Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Min 8 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                            minLength={8}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            User will be required to change password on first login
                        </p>
                    </div>

                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                        </label>
                        <select
                            id="role"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'OWNER' | 'STAFF')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="STAFF">Staff</option>
                            <option value="OWNER">Owner</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                        >
                            {isSubmitting && <Icons.spinner className="h-4 w-4 animate-spin mr-2" />}
                            {isSubmitting ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </SimpleModal>

            {/* Reset Password Modal */}
            <SimpleModal
                isOpen={showResetPasswordModal}
                onClose={() => {
                    setShowResetPasswordModal(false);
                    setFormError(null);
                    setResetPassword('');
                    setSelectedUser(null);
                }}
                title="Reset Password"
                size="sm"
            >
                <form onSubmit={handleResetPassword} className="space-y-4">
                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                            {formError}
                        </div>
                    )}

                    <p className="text-sm text-gray-600">
                        Reset password for <strong>{selectedUser?.email}</strong>
                    </p>

                    <div>
                        <label htmlFor="resetPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <input
                            id="resetPassword"
                            type="password"
                            placeholder="Min 8 characters"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                            minLength={8}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            User will be required to change password on next login
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setShowResetPasswordModal(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                        >
                            {isSubmitting && <Icons.spinner className="h-4 w-4 animate-spin mr-2" />}
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </form>
            </SimpleModal>
        </div>
    );
}
