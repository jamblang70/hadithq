#!/bin/bash

# Hadith Search - Update Script
# Run this to update the application

set -e

echo "=========================================="
echo "Hadith Search - Update"
echo "=========================================="
echo ""

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

echo "Pulling latest changes from git..."
git pull

echo ""
echo "Updating backend..."
cd backend
npm install

echo ""
echo "Updating frontend..."
cd ../frontend
npm install
npm run build

echo ""
echo "Restarting backend..."
pm2 restart hadith-backend

echo ""
echo "=========================================="
echo "✅ Update Complete!"
echo "=========================================="
echo ""
echo "Application has been updated and restarted."
echo ""
