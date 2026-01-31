'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChangePasswordRequest } from '@/types/auth';

export default function ChangePasswordPage() {
    const [formData, setFormData] = useState<ChangePasswordRequest & { confirmPassword: string }>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(password)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(password)) {
            return 'Password must contain at least one number';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const { currentPassword, newPassword, confirmPassword } = formData;

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (currentPassword === newPassword) {
            setError('New password must be different from current password');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to dashboard on success
                router.push('/app/dashboard');
            } else {
                setError(data.message || 'Failed to change password');
            }
        } catch (err) {
            console.error('Change password error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Your Password</h2>
                        <p className="text-gray-600">
                            For security reasons, you must change your password before continuing.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-900 mb-2">
                                Current Password
                            </label>
                            <input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter current password"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900 mb-2">
                                New Password
                            </label>
                            <input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter new password"
                                value={formData.newPassword}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Must be at least 8 characters with uppercase, lowercase, and number
                            </p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                                Confirm New Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Confirm new password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                                <svg className="h-5 w-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="text-sm text-red-700">{error}</div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading && (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isLoading ? 'Changing Password...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
