# Data Room MVP

A secure document repository that allows users to import files from Google Drive, similar to enterprise data room solutions used for due diligence.

## Features

- Google OAuth authentication
- Import files from Google Drive
- View imported files in browser
- Download files
- Delete files from data room
- Token refresh handling
- Responsive UI with Tailwind CSS

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite 7
- Tailwind CSS + shadcn/ui
- Lucide icons
- Vitest + Testing Library (66% test coverage)

**Backend:**
- Flask 3.1
- SQLAlchemy + PostgreSQL
- Google OAuth 2.0
- Pytest + pytest-flask (79% test coverage)
- Structured logging with rotating file handlers

## Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL
- Google Cloud Console account

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Drive API**
4. Go to **APIs & Services > Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
6. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/callback`
   - Production: `https://your-domain.com/api/auth/callback`
7. Go to **OAuth consent screen**
   - Add test users (emails that can use the app)
   - Add scopes: `drive.readonly`, `userinfo.email`, `userinfo.profile`

## Local Development Setup

### 1. Clone and setup environment

```bash
# Clone the repository
git clone <repo-url>
cd dataroom

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Configure environment variables

Edit `backend/.env`:
```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/dataroom
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
FRONTEND_URL=http://localhost:5173
SECRET_KEY=your-secret-key-here
```

### 3. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL (if not running)
# Option A: Using Docker
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dataroom postgres:15-alpine

# Option B: Using local PostgreSQL
createdb dataroom

# Run the backend
python app.py
```

Backend runs at http://localhost:5000

**Logging:** Application logs are written to `backend/logs/dataroom.log` in production (with 10MB rotation). In development mode (FLASK_ENV=dev), logs output to console with DEBUG level.

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend runs at http://localhost:5173

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage report
pytest --cov=. --cov-report=term-missing

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_file_import.py
```

**Coverage:** 79% (29 tests)
- Authentication flow (10 tests)
- File management (9 tests)
- Google Drive import (10 tests)

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run with UI
npm run test:ui
```

**Coverage:** 66% (54 tests)
- App component (16 tests)
- FileList component (11 tests)
- GoogleDrivePicker component (12 tests)
- API client (8 tests)
- ConfirmDialog component (7 tests)

## Docker Deployment

### Using Docker Compose

```bash
# Create .env file in root directory
cp backend/.env.example .env

# Edit .env with your Google credentials
nano .env

# Build and run
docker-compose up --build
```

Access the app at http://localhost:5173

### Environment Variables for Docker

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
FRONTEND_URL=http://localhost:5173
SECRET_KEY=change-this-in-production
VITE_API_URL=http://localhost:5000/api
```

## Production Deployment

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:create_app()`
4. Add environment variables

### Frontend (Vercel)

1. Import project on Vercel
2. Set root directory to `frontend`
3. Add environment variable:
   - `VITE_API_URL=https://your-backend.onrender.com/api`

### Database (Render PostgreSQL)

1. Create PostgreSQL database on Render
2. Copy the connection string
3. Add as `DATABASE_URL` to backend environment

## Design Decisions

### Architecture
- **Separation of concerns**: Backend handles OAuth, file storage, and DB operations. Frontend is a pure SPA.
- **Session-based auth**: Simpler than JWT for this use case, handles token refresh transparently.
- **File storage on disk**: As per requirements. In production, would use S3/GCS.

### Code Quality
- **Comprehensive test coverage**: 79% backend, 66% frontend with unit and integration tests
- **Modern dependencies**: Latest stable versions of Flask 3.1, React 19, SQLAlchemy
- **Structured logging**: Rotating file handlers with configurable log levels (INFO in production, DEBUG in dev)
- **Clean imports**: All imports organized at the top of files for better maintainability
- **Type safety**: TypeScript on frontend, type hints on backend

### Security
- OAuth tokens stored server-side only
- Automatic token refresh
- Files are user-scoped (users can only access their own files)
- CORS configured for specific origins
- Secure session cookies with SameSite protection

### UX Considerations
- Clean, minimal interface inspired by Google Drive
- Loading states for all async operations
- Breadcrumb navigation for folder browsing
- File type icons for quick visual identification
- Responsive design for mobile/desktop

### Trade-offs
- **Custom file browser vs Google Picker**: Used custom browser for more control over UX, though Google Picker would be faster to implement.
- **Session storage**: Simpler but requires cookies. For a distributed setup, would use Redis for session storage.

## API Endpoints

### Auth
- `GET /api/auth/login` - Get Google OAuth URL
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/status` - Check auth status
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Files
- `GET /api/files` - List user's files
- `GET /api/files/drive` - List Google Drive files
- `POST /api/files/import` - Import file from Drive
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/view` - View file in browser
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

## Troubleshooting

### 403 Error after OAuth
This happens when the Drive API call isn't made immediately after authentication. The backend already handles this by making a list call right after OAuth.

### Token Expired
Tokens are automatically refreshed when expired. If refresh fails, user is redirected to login.

### Test with different emails
Make sure to add test users in Google Cloud Console OAuth consent screen.

## License

MIT
