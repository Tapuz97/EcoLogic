# EcoLogic WebApp

A comprehensive ecological data management and analysis platform for snail observation reports and scientific data visualization.

## 🚀 Features

- **Admin Dashboard**: Real-time analytics, reports management, and data visualization
- **User Interface**: Report submission and profile management
- **Statistical Analysis**: T-tests, ANOVA, regression analysis, chi-square tests, and kriging interpolation
- **Data Export**: CSV, JSON, and XLSX export capabilities
- **Caching System**: Client-side and server-side caching for optimal performance
- **Fake Data Mode**: Development and testing with realistic generated data

## 📊 Data Tables & Requirements

### Reports Collection (`reports`)

**Purpose**: User-submitted snail observation reports

```json
{
  "id": "string (auto-generated)",
  "u_id": "string (user ID)",
  "species_name": "string (snail species)",
  "location": "object (coordinates)",
  "site": "string (observation site)",
  "name": "string (report title)",
  "description": "string (optional)",
  "image_url": "string (optional)",
  "status": "boolean|null (approved/denied/pending)",
  "coins": "number (reward coins)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Snail Observations Collection (`snail_observations`)

**Purpose**: Scientific snail density observations

```json
{
  "id": "string (auto-generated)",
  "species": "string (snail species name)",
  "site": "string (observation site)",
  "habitat": "string (rocky/sandy/muddy/vegetated)",
  "density_per_m2": "number (snails per square meter)",
  "depth": "number (1 or 3 meters)",
  "coordinates": "object {lat: number, lng: number}",
  "status": "string (approved/denied/pending)",
  "source": "string (scientist/user)"
}
```

### Water Chemistry Collection (`water_chemistry`)

**Purpose**: Water quality measurements

```json
{
  "id": "string (auto-generated)",
  "station": "string (measurement station)",
  "avg_ph": "number (pH value 6-8)",
  "avg_temperature": "number (temperature in Celsius)",
  "avg_dissolved_oxygen": "number (oxygen in mg/L)"
}
```

### Snail Species Collection (`snail_species`)

**Purpose**: Species classification and status

```json
{
  "id": "string (auto-generated)",
  "name": "string (species name)",
  "status": "string (invasive/native/unknown)"
}
```

### Probe Profiles Collection (`probe_profiles`)

**Purpose**: Environmental probe measurements (optional)

```json
{
  "id": "string (auto-generated)",
  "station": "string (probe station)",
  "measurements": "array (various environmental data)"
}
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+
- Firebase project with Firestore database
- Vercel account (for deployment)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ecologic-webapp.git
cd ecologic-webapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

#### Option A: Using Setup Script (Recommended)

1. Place your Firebase service account JSON file in the project root as `firebase-key.json`
2. Run the setup script:

```bash
node setup-env.js
```

#### Option B: Manual Setup

1. Create a `.env` file in the project root:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
```

### 4. Firebase Configuration

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key (JSON file)
3. Save as `firebase-key.json` in project root
4. Run `node setup-env.js` to generate `.env`

### 5. Database Setup

Create the following Firestore collections:

- `reports`
- `snail_observations`
- `water_chemistry`
- `snail_species`
- `probe_profiles` (optional)

### 6. Development Mode

```bash
# Start development server
npm run dev

# Or using Vercel CLI
vercel dev
```

### 7. Production Deployment

```bash
# Deploy to Vercel
vercel --prod

# Or connect GitHub repository to Vercel for automatic deployments
```

## 🔧 Configuration

### Fake Data Mode

For development and testing, fake data can be enabled by setting:

```javascript
const USE_FAKE_DATA = true;
```

In the following files:

- `api/reports.js`
- `api/dashboard-parser.js`
- `api/analytics-parser.js`
- `api/scientific-data.js`

### Caching Settings

- **Client-side cache**: 1 hour (configurable in `AdminApp.js`)
- **Server-side cache**: 5 minutes for reports, 1 hour for analytics
- **Cache keys**: Prefixed with `ecologic_cache_`

### API Endpoints

#### Reports

- `GET /api/reports` - Get all reports
- `POST /api/reports` - Submit new report

#### Dashboard

- `GET /api/dashboard-parser?endpoint=dashboard_stats` - Dashboard KPIs
- `GET /api/dashboard-parser?endpoint=latest_reports` - Latest 10 reports

#### Analytics

- `GET /api/analytics-parser?endpoint=t_test_depth` - T-test by depth
- `GET /api/analytics-parser?endpoint=anova_beach` - ANOVA by beach
- `GET /api/analytics-parser?endpoint=anova_habitat` - ANOVA by habitat
- `GET /api/analytics-parser?endpoint=regression_waterlevel` - Water level regression
- `GET /api/analytics-parser?endpoint=chi_species_by` - Chi-square species analysis
- `GET /api/analytics-parser?endpoint=kriging_map` - Kriging interpolation map
- `GET /api/analytics-parser?endpoint=species_list` - Available species list

#### Export

- `GET /api/report-export-parser?format=csv` - Export reports as CSV
- `GET /api/report-export-parser?format=json` - Export reports as JSON
- `GET /api/report-export-parser?format=xlsx` - Export reports as XLSX

## 📁 Project Structure

```
ecologic-webapp/
├── api/                          # Vercel serverless functions
│   ├── firebase-admin.js        # Firebase Admin SDK setup
│   ├── reports.js               # Reports CRUD operations
│   ├── dashboard-parser.js      # Dashboard statistics
│   ├── analytics-parser.js      # Statistical analysis
│   ├── report_export-parser.js  # Data export functionality
│   └── scientific-data.js       # Scientific data management
├── assets/                       # Static assets
│   ├── css/                     # Stylesheets
│   ├── js/                      # Client-side JavaScript
│   ├── icons/                   # UI icons
│   └── logos/                   # Application logos
├── Admin/                       # Admin interface pages
├── User/                        # User interface pages
├── dist/                        # Built/compiled files
├── setup-env.js                 # Environment setup script
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## 🔒 Security

- Firebase Admin SDK for secure database access
- CORS headers configured for API endpoints
- Input validation and sanitization
- No sensitive data in client-side code
- Environment variables for all secrets

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the project: `npm run build`
2. Deploy to your preferred platform
3. Set environment variables
4. Configure domain and SSL

## 🧪 Testing

### Fake Data Testing

1. Set `USE_FAKE_DATA = true` in API files
2. Access admin dashboard to see generated data
3. Test all analytics charts and reports

### Real Data Testing

1. Set `USE_FAKE_DATA = false` in API files
2. Ensure Firebase collections are populated
3. Test with real data scenarios

## 📈 Performance

- **Client-side caching**: Reduces API calls
- **Server-side caching**: Minimizes Firebase reads
- **Parallel data fetching**: Optimizes database queries
- **Lazy loading**: Charts load on demand
- **Compressed assets**: Faster page loads

## 🐛 Troubleshooting

### Common Issues

1. **500 errors in Vercel**: Check environment variables and Firebase configuration
2. **CORS errors**: Verify CORS headers in API functions
3. **Firebase quota exceeded**: Enable caching and reduce API calls
4. **Charts not loading**: Check browser console for JavaScript errors

### Debug Mode

Enable debug logging by setting:

```javascript
const DEBUG = true;
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:

- Create an issue on GitHub
- Check the troubleshooting section
- Review Firebase and Vercel documentation

---

**Note**: This application is designed for ecological research and data management. Ensure compliance with data protection regulations when handling sensitive environmental data.
