#!/bin/bash

# HOMA Staging Deployment Script
# Run: bash deploy-staging.sh

set -e

echo "🚀 HOMA Staging Deployment"
echo "=========================="
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

echo "📦 Step 1: Building locally to verify..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi

echo "✅ Build successful!"
echo ""

echo "🔐 Step 2: Vercel Login"
vercel login

echo ""
echo "📝 Step 3: Configure Environment Variables"
echo ""
echo "Please have these ready:"
echo "  - DATABASE_URL (from Neon/PostgreSQL)"
echo "  - JWT_SECRET (min 32 characters)"
echo ""
read -p "Press Enter when ready..."

echo ""
echo "🚢 Step 4: Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📍 Next Steps:"
echo "  1. Go to Vercel dashboard: https://vercel.com/dashboard"
echo "  2. Add environment variables if not set:"
echo "     - DATABASE_URL"
echo "     - JWT_SECRET"
echo "     - NODE_ENV=production"
echo "  3. Redeploy if needed: vercel --prod"
echo ""
echo "🎉 Your app should be live at: https://homa-intools.vercel.app"
