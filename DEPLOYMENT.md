# EcoLogic WebApp - Deployment Guide

This guide covers deploying the EcoLogic WebApp to various platforms with proper environment configuration.

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/ecologic-webapp.git
cd ecologic-webapp

# Install dependencies
npm install

# Setup environment (requires firebase-key.json)
npm run setup
```

### 2. Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable Firestore Database
4. Go to Project Settings → Service Accounts
5. Generate new private key (JSON)
6. Save as `firebase-key.json` in project root
7. Run `npm run setup`

## 🌐 Deployment Options

### Vercel (Recommended)

#### Automatic Deployment
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
   USE_FAKE_DATA=false
   ```
3. Deploy automatically on push to main branch

#### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_PRIVATE_KEY
# ... (add all required variables)
```

### Netlify

#### Netlify Functions
1. Build the project: `npm run build`
2. Deploy to Netlify
3. Set environment variables in Netlify dashboard
4. Configure redirects for SPA routing

#### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "api"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### AWS Lambda + S3

#### Serverless Framework
1. Install Serverless: `npm i -g serverless`
2. Configure `serverless.yml`:
```yaml
service: ecologic-webapp

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    FIREBASE_PROJECT_ID: ${env:FIREBASE_PROJECT_ID}
    FIREBASE_PRIVATE_KEY: ${env:FIREBASE_PRIVATE_KEY}
    # ... other variables

functions:
  api:
    handler: api/index.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true

plugins:
  - serverless-s3-sync

custom:
  s3Sync:
    - bucketName: ${self:service}-${self:provider.stage}-static
      localDir: dist
      deleteRemoved: true
```

3. Deploy: `serverless deploy`

### Google Cloud Platform

#### Cloud Functions + Cloud Storage
1. Install Google Cloud SDK
2. Set up Cloud Functions:
```bash
# Deploy functions
gcloud functions deploy api \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --source api \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id
```

3. Deploy static files to Cloud Storage
4. Configure load balancer for routing

### Docker

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  ecologic:
    build: .
    ports:
      - "3000:3000"
    environment:
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
      # ... other variables
    volumes:
      - ./logs:/app/logs
```

## 🔧 Environment Variables

### Required Variables
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
```

### Optional Variables
```bash
# Application Configuration
NODE_ENV=production
PORT=3000
CACHE_DURATION=3600000
REPORTS_CACHE_DURATION=300000
USE_FAKE_DATA=false
API_VERSION=v1
CORS_ORIGIN=*
LOG_LEVEL=info
DEBUG=false

# Vercel Specific
VERCEL_URL=your-app.vercel.app
VERCEL_ENV=production
```

## 🗄️ Database Setup

### Firestore Collections
Create the following collections in your Firebase project:

1. **reports** - User-submitted reports
2. **snail_observations** - Scientific observations
3. **water_chemistry** - Water quality data
4. **snail_species** - Species classification
5. **probe_profiles** - Environmental probe data (optional)

### Sample Data Structure
See README.md for detailed data structure requirements.

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env` or `firebase-key.json` to version control
- Use platform-specific secret management
- Rotate keys regularly
- Use least-privilege access

### Firebase Security Rules
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reports collection
    match /reports/{document} {
      allow read: if true; // Public read for admin dashboard
      allow write: if request.auth != null; // Authenticated write
    }
    
    // Scientific data collections
    match /snail_observations/{document} {
      allow read: if true; // Public read for analytics
      allow write: if false; // Admin-only write
    }
    
    match /water_chemistry/{document} {
      allow read: if true;
      allow write: if false;
    }
    
    match /snail_species/{document} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

### CORS Configuration
Ensure CORS headers are properly configured in API functions:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

## 📊 Monitoring & Logging

### Vercel Analytics
- Enable Vercel Analytics in dashboard
- Monitor function performance
- Track error rates

### Firebase Monitoring
- Enable Firebase Performance Monitoring
- Set up alerts for quota usage
- Monitor database performance

### Custom Logging
```javascript
// Add to API functions
console.log('API Request:', {
  method: req.method,
  url: req.url,
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent']
});
```

## 🚨 Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check environment variables
   - Verify Firebase configuration
   - Check function logs

2. **CORS Errors**
   - Verify CORS headers in API functions
   - Check allowed origins

3. **Firebase Quota Exceeded**
   - Enable caching
   - Optimize queries
   - Consider upgrading plan

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies installed
   - Check for TypeScript errors

### Debug Mode
Enable debug logging:
```bash
DEBUG=true npm run dev
```

### Health Checks
Test API endpoints:
```bash
# Test reports endpoint
curl https://your-app.vercel.app/api/reports

# Test dashboard endpoint
curl https://your-app.vercel.app/api/dashboard-parser?endpoint=dashboard_stats

# Test analytics endpoint
curl https://your-app.vercel.app/api/analytics-parser?endpoint=t_test_depth
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📈 Performance Optimization

### Caching Strategy
- Client-side: 1 hour for static data
- Server-side: 5 minutes for reports, 1 hour for analytics
- CDN: Static assets cached for 1 year

### Database Optimization
- Use indexes for frequently queried fields
- Implement pagination for large datasets
- Use compound queries efficiently

### Function Optimization
- Keep functions warm with scheduled pings
- Optimize bundle size
- Use connection pooling for database

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] Firebase security rules set
- [ ] CORS headers configured
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring enabled
- [ ] Error tracking set up
- [ ] Backup strategy implemented
- [ ] Performance monitoring active
- [ ] Security headers configured

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review platform-specific documentation
3. Check function logs
4. Create an issue on GitHub

---

**Note**: This deployment guide covers the most common scenarios. Adjust configurations based on your specific requirements and platform constraints.
