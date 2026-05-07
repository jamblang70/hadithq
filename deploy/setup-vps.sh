#!/bin/bash

# Hadith Search - VPS Setup Script
# Run this on a fresh Ubuntu/Debian VPS

set -e

echo "=========================================="
echo "Hadith Search - VPS Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use: sudo bash setup-vps.sh)"
    exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., hadith.example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

echo ""
echo "Installing system dependencies..."
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 20
echo ""
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
echo ""
echo "Installing PM2..."
npm install -g pm2

# Create app directory
echo ""
echo "Creating application directory..."
mkdir -p /var/www/hadith-app
cd /var/www/hadith-app

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clone your repository to /var/www/hadith-app"
echo "2. Run: bash deploy/deploy.sh"
echo ""
