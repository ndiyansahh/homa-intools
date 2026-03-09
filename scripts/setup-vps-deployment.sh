#!/bin/bash
# Setup deployment scripts on VPS
# Run this from your LOCAL machine

VPS_IP="194.233.68.67"
VPS_USER="root"

echo "========================================="
echo "  Setup HOMA VPS Deployment Scripts"
echo "========================================="
echo ""

# Check if we can connect to VPS
echo "[1/3] Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 $VPS_USER@$VPS_IP "echo 'Connected successfully'"; then
    echo "❌ Cannot connect to VPS. Check your SSH access."
    exit 1
fi
echo "✅ SSH connection successful"
echo ""

# Copy deployment scripts to staging
echo "[2/3] Copying scripts to staging..."
ssh $VPS_USER@$VPS_IP "mkdir -p /var/www/homa-staging/scripts"
scp scripts/deploy-staging.sh $VPS_USER@$VPS_IP:/var/www/homa-staging/scripts/
ssh $VPS_USER@$VPS_IP "chmod +x /var/www/homa-staging/scripts/deploy-staging.sh"
echo "✅ Staging scripts copied"
echo ""

# Copy deployment scripts to production
echo "[3/3] Copying scripts to production..."
ssh $VPS_USER@$VPS_IP "mkdir -p /var/www/homa-production/scripts"
scp scripts/deploy-production.sh $VPS_USER@$VPS_IP:/var/www/homa-production/scripts/
ssh $VPS_USER@$VPS_IP "chmod +x /var/www/homa-production/scripts/deploy-production.sh"
echo "✅ Production scripts copied"
echo ""

echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "You can now deploy using:"
echo ""
echo "  Staging:"
echo "    ssh $VPS_USER@$VPS_IP"
echo "    cd /var/www/homa-staging"
echo "    bash scripts/deploy-staging.sh"
echo ""
echo "  Production:"
echo "    ssh $VPS_USER@$VPS_IP"
echo "    cd /var/www/homa-production"
echo "    bash scripts/deploy-production.sh"
echo ""
