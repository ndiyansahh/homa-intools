/**
 * Next.js Instrumentation
 *
 * This file runs BEFORE the application starts.
 * Used for environment validation to prevent security misconfigurations.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { validateEnvironmentVariables } from './lib/env-validation';

export async function register() {
  // SECURITY: Validate environment variables before application starts
  // This prevents the app from running with insecure configurations
  try {
    validateEnvironmentVariables();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    // Exit the process to prevent insecure startup
    process.exit(1);
  }
}
