# Deployment Guide - VPS

Panduan lengkap untuk deploy aplikasi Hadith Search di VPS sendiri.

## Persyaratan

- VPS dengan Ubuntu 20.04+ atau Debian 11+
- Minimal 1GB RAM
- Domain yang sudah pointing ke IP VPS
- Akses SSH ke VPS

## Langkah 1: Persiapan VPS

Login ke VPS via SSH:
```bash
ssh root@your-vps-ip
```

Download dan jalankan setup script:
```bash
curl -o setup-vps.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy/setup-vps.sh
chmod +x setup-vps.sh
sudo bash setup-vps.sh
```

Script ini akan install:
- Node.js 20
- PM2 (process manager)
- Nginx (web server)
- Certbot (SSL certificate)

## Langkah 2: Clone Repository

```bash
cd /var/www/hadith-app
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

## Langkah 3: Setup Environment Variables

Edit file `.env` di folder backend:
```bash
cd /var/www/hadith-app/backend
cp .env.example .env
nano .env
```

Isi dengan credentials production:
```env
PORT=3000
NODE_ENV=production

OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://ai.sumopod.com/v1
LLM_MODEL=MiniMax-M2.7-highspeed

DATABASE_URL=your-neon-database-url
QDRANT_URL=your-qdrant-url
QDRANT_API_KEY=your-qdrant-api-key

REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://your-domain.com
```

## Langkah 4: Deploy

Jalankan deployment script:
```bash
cd /var/www/hadith-app
chmod +x deploy/deploy.sh
sudo bash deploy/deploy.sh
```

Script akan:
1. Install dependencies (backend & frontend)
2. Build frontend
3. Setup PM2 untuk backend
4. Configure Nginx
5. Setup SSL certificate (HTTPS)

Ikuti instruksi di layar dan masukkan:
- Domain name (e.g., hadith.example.com)
- Email untuk SSL certificate

## Langkah 5: Verifikasi

Buka browser dan akses:
```
https://your-domain.com
```

Aplikasi seharusnya sudah berjalan!

## Update Aplikasi

Untuk update ke versi terbaru:
```bash
cd /var/www/hadith-app
sudo bash deploy/update.sh
```

## Monitoring

### Lihat logs backend:
```bash
pm2 logs hadith-backend
```

### Monitor resource usage:
```bash
pm2 monit
```

### Restart backend:
```bash
pm2 restart hadith-backend
```

### Check Nginx status:
```bash
sudo systemctl status nginx
```

### View Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Troubleshooting

### Backend tidak jalan:
```bash
pm2 logs hadith-backend
pm2 restart hadith-backend
```

### Frontend tidak muncul:
```bash
# Check Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Rebuild frontend
cd /var/www/hadith-app/frontend
npm run build
```

### SSL certificate error:
```bash
# Renew certificate
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx
```

### Database connection error:
- Pastikan DATABASE_URL di `.env` benar
- Cek apakah Neon database masih aktif
- Restart backend: `pm2 restart hadith-backend`

## Backup

### Backup environment variables:
```bash
cp /var/www/hadith-app/backend/.env ~/hadith-env-backup
```

### Backup PM2 config:
```bash
pm2 save
```

## Security Tips

1. **Firewall**: Hanya buka port 80, 443, dan SSH
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **Auto-update SSL**: Certbot sudah setup auto-renew

3. **Monitor logs**: Cek logs secara berkala untuk aktivitas mencurigakan

4. **Update system**: Jalankan update rutin
```bash
sudo apt update && sudo apt upgrade -y
```

## Rekomendasi VPS

| Provider | Harga | Specs | Link |
|----------|-------|-------|------|
| Contabo | €4.50/bulan | 4GB RAM, 50GB SSD | contabo.com |
| DigitalOcean | $6/bulan | 1GB RAM, 25GB SSD | digitalocean.com |
| Vultr | $6/bulan | 1GB RAM, 25GB SSD | vultr.com |
| Hetzner | €4.51/bulan | 4GB RAM, 40GB SSD | hetzner.com |

Minimal requirement: **1GB RAM, 20GB Storage**

## Support

Jika ada masalah, cek:
1. PM2 logs: `pm2 logs hadith-backend`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. System logs: `sudo journalctl -xe`
