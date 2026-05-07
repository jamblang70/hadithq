# 🚀 Deployment Guide

Panduan deploy aplikasi Hadith Search ke production.

## 📋 Pilihan Deployment

### 1. VPS (Recommended) - $4-6/bulan
✅ Full control  
✅ Tidak ada cold start  
✅ Bisa custom semuanya  

**Langkah:**
1. Sewa VPS (Contabo, DigitalOcean, Vultr, Hetzner)
2. Ikuti panduan di [`deploy/README.md`](deploy/README.md)
3. Jalankan script otomatis

### 2. Railway - $5/bulan
✅ Setup mudah  
✅ Auto-deploy dari GitHub  
✅ Built-in monitoring  

**Langkah:**
1. Push code ke GitHub
2. Connect Railway ke repo
3. Set environment variables
4. Deploy!

### 3. Vercel (Frontend) + Railway (Backend)
✅ Frontend gratis unlimited  
✅ Backend $5/bulan  
✅ Global CDN  

**Langkah:**
1. Deploy backend ke Railway
2. Deploy frontend ke Vercel
3. Set `VITE_API_URL` di Vercel

## 🔧 Quick Start - VPS Deployment

### Prerequisites
- VPS dengan Ubuntu 20.04+
- Domain yang sudah pointing ke VPS
- Akses SSH

### One-Command Setup

```bash
# 1. Login ke VPS
ssh root@your-vps-ip

# 2. Download setup script
curl -o setup-vps.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy/setup-vps.sh

# 3. Run setup
chmod +x setup-vps.sh
sudo bash setup-vps.sh

# 4. Clone repository
cd /var/www/hadith-app
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# 5. Setup environment
cd backend
cp .env.example .env
nano .env  # Edit dengan credentials production

# 6. Deploy!
cd ..
chmod +x deploy/deploy.sh
sudo bash deploy/deploy.sh
```

Selesai! Aplikasi akan berjalan di `https://your-domain.com`

## 📝 Environment Variables

### Backend (.env)
```env
PORT=3000
NODE_ENV=production

# API Keys
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://ai.sumopod.com/v1
LLM_MODEL=MiniMax-M2.7-highspeed

# Databases
DATABASE_URL=postgresql://...
QDRANT_URL=https://...
QDRANT_API_KEY=xxx

# Optional
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://your-domain.com
```

### Frontend (.env.production)
```env
VITE_API_URL=https://your-domain.com/api
```

## 🔄 Update Aplikasi

```bash
cd /var/www/hadith-app
sudo bash deploy/update.sh
```

## 📊 Monitoring

```bash
# Backend logs
pm2 logs hadith-backend

# Resource usage
pm2 monit

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## 🛡️ Security Checklist

- [ ] Firewall enabled (port 22, 80, 443 only)
- [ ] SSL certificate installed (HTTPS)
- [ ] Environment variables tidak di-commit ke git
- [ ] Database credentials aman
- [ ] Regular system updates

## 💰 Cost Estimation

### VPS Option
- VPS: $4-6/bulan
- Domain: $10-15/tahun
- **Total: ~$5-7/bulan**

### Cloud Option (Railway + Vercel)
- Railway (Backend): $5/bulan
- Vercel (Frontend): Gratis
- **Total: $5/bulan**

### Database & Services (Sudah ada)
- Neon PostgreSQL: Gratis tier ✅
- Qdrant Cloud: Gratis tier ✅
- Sumopod API: Pay per use ✅

## 🆘 Troubleshooting

### Backend tidak jalan
```bash
pm2 logs hadith-backend
pm2 restart hadith-backend
```

### Frontend tidak muncul
```bash
cd /var/www/hadith-app/frontend
npm run build
sudo systemctl restart nginx
```

### SSL error
```bash
sudo certbot renew
sudo systemctl restart nginx
```

## 📚 Dokumentasi Lengkap

- [VPS Deployment Guide](deploy/README.md)
- [Backend API Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)

## 🎯 Next Steps

Setelah deploy:
1. Test semua fitur (search, AI chat, bookmarks)
2. Setup monitoring (Uptime Robot, Better Stack)
3. Backup environment variables
4. Setup auto-backup database (jika perlu)
5. Configure CDN (Cloudflare) untuk performa lebih baik

## 💡 Tips

1. **Gunakan Cloudflare** (gratis) untuk:
   - CDN global
   - DDoS protection
   - SSL/TLS
   - Caching

2. **Monitor uptime** dengan:
   - UptimeRobot (gratis)
   - Better Stack (gratis tier)

3. **Backup rutin**:
   - Environment variables
   - PM2 configuration
   - Nginx configuration

## 📞 Support

Jika ada masalah:
1. Cek logs: `pm2 logs hadith-backend`
2. Cek Nginx: `sudo nginx -t`
3. Cek system: `sudo journalctl -xe`
