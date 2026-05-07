#!/bin/bash

# Hadith Search - Deployment Script
# Run this after cloning the repository

set -e

echo "=========================================="
echo "Hadith Search - Deployment"
echo "=========================================="
echo ""

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

# Get domain name
read -p "Enter your domain name (e.g., hadith.example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

echo ""
echo "=========================================="
echo "Step 1: Backend Setup"
echo "=========================================="

cd backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env with your production credentials"
    echo "Press Enter after you've edited the .env file..."
    read
fi

echo "Installing backend dependencies..."
npm install

echo "Building backend..."
npm run build 2>/dev/null || echo "No build step needed"

echo ""
echo "=========================================="
echo "Step 2: Frontend Setup"
echo "=========================================="

cd ../frontend

# Create production env file
echo "Creating frontend production config..."
cat > .env.production << EOF
VITE_API_URL=https://${DOMAIN}/api
EOF

echo "Installing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

echo ""
echo "=========================================="
echo "Step 3: PM2 Setup"
echo "=========================================="

cd ../backend

# Stop existing process if any
pm2 delete hadith-backend 2>/dev/null || true

# Start backend with PM2
echo "Starting backend with PM2..."
pm2 start npm --name "hadith-backend" -- run start

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER 2>/dev/null || pm2 startup

echo ""
echo "=========================================="
echo "Step 4: Nginx Setup"
echo "=========================================="

# Create Nginx config
cat > /etc/nginx/sites-available/hadith << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend (static files)
    location / {
        root ${APP_DIR}/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout untuk AI requests
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/hadith /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
echo "Testing Nginx configuration..."
nginx -t

# Restart Nginx
echo "Restarting Nginx..."
systemctl restart nginx

echo ""
echo "=========================================="
echo "Step 5: SSL Certificate (Let's Encrypt)"
echo "=========================================="

echo "Obtaining SSL certificate..."
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Your application is now running at:"
echo "🌐 https://${DOMAIN}"
echo ""
echo "Useful commands:"
echo "  pm2 logs hadith-backend    - View backend logs"
echo "  pm2 restart hadith-backend - Restart backend"
echo "  pm2 monit                  - Monitor resources"
echo ""
echo "To update the application, run:"
echo "  bash deploy/update.sh"
echo ""
