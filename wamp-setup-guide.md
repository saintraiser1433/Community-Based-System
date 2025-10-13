# WAMP + Next.js Integration Guide

## 🚀 Quick Setup for WAMP Server

### Option 1: Docker Integration (Recommended)

1. **Install Docker Desktop** on your Windows machine
2. **Start WAMP Server** (Apache + MySQL + PHP)
3. **Run the Next.js app in Docker**:

```bash
# Build and run the application
docker-compose up -d

# Check if containers are running
docker ps
```

4. **Access your application**:
   - Next.js App: http://localhost:3000
   - WAMP Server: http://localhost (default)
   - Combined: http://localhost/cbds (with Apache proxy)

### Option 2: Direct WAMP Integration

1. **Copy your built Next.js app** to WAMP's www directory:
```bash
# Copy the .next folder and other necessary files
xcopy /E /I .next C:\wamp64\www\cbds\.next
xcopy /E /I public C:\wamp64\www\cbds\public
xcopy /E /I prisma C:\wamp64\www\cbds\prisma
copy package.json C:\wamp64\www\cbds\
copy next.config.ts C:\wamp64\www\cbds\
```

2. **Install Node.js dependencies** in WAMP directory:
```bash
cd C:\wamp64\www\cbds
npm install --production
```

3. **Configure Apache** (add to httpd.conf):
```apache
# Enable required modules
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so

# Include the virtual host configuration
Include conf/extra/wamp-apache-config.conf
```

4. **Start the Next.js server**:
```bash
cd C:\wamp64\www\cbds
npm start
```

### Option 3: Hybrid Setup (Best of Both Worlds)

1. **Keep WAMP for PHP/MySQL** applications
2. **Run Next.js on separate port** (3000)
3. **Use Apache as reverse proxy** to serve both

## 🔧 Configuration Files

### Apache Virtual Host (wamp-apache-config.conf)
- Handles proxy routing to Next.js
- Manages static file serving
- Enables CORS for API calls

### Docker Compose (docker-compose.yml)
- Runs Next.js in containerized environment
- Includes PostgreSQL option
- Manages volumes and networking

### Next.js Config (next.config.ts)
- Standalone output for production
- Disabled build-time checks for deployment

## 📁 Directory Structure

```
C:\wamp64\www\
├── cbds/                 # Your Next.js application
│   ├── .next/           # Built application
│   ├── public/          # Static assets
│   ├── prisma/          # Database files
│   └── package.json     # Dependencies
├── your-php-apps/       # Other WAMP applications
└── index.php            # WAMP default page
```

## 🌐 Access URLs

- **WAMP Default**: http://localhost
- **Next.js Direct**: http://localhost:3000
- **Next.js via WAMP**: http://localhost/cbds
- **API Endpoints**: http://localhost/cbds/api/...

## 🔍 Troubleshooting

### Port Conflicts
- Ensure port 3000 is not used by other applications
- Check WAMP's Apache configuration for port conflicts

### Database Issues
- SQLite database should be in `prisma/dev.db`
- Ensure proper file permissions for database access

### Static Files Not Loading
- Check Apache proxy configuration
- Verify file paths in Next.js build

### CORS Issues
- Ensure Apache headers module is enabled
- Check proxy configuration for API routes

## 🚀 Production Deployment

For production deployment:

1. **Use environment variables**:
```env
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret
DATABASE_URL=your-production-database-url
```

2. **Configure SSL/HTTPS** in Apache
3. **Set up proper logging** and monitoring
4. **Use PM2** for process management:
```bash
npm install -g pm2
pm2 start npm --name "cbds" -- start
pm2 startup
pm2 save
```

## 📞 Support

If you encounter issues:
1. Check WAMP error logs in `C:\wamp64\logs\`
2. Verify Docker container logs: `docker logs <container-name>`
3. Test Next.js directly: `npm run dev`
4. Check Apache configuration syntax


