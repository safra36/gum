# GUM - Git Unified Manager
### A Comprehensive Deployment Management Platform

A powerful, enterprise-ready web application for managing complex deployment workflows, Git operations, and multi-stage CI/CD processes with advanced user management and real-time execution monitoring.

## 🚀 Key Features

### 📋 **Project Management**
- **Multi-Project Dashboard**: Centralized view of all deployment projects
- **Rich Project Configuration**: Title, working directory, and custom staging pipelines
- **Project Permissions**: Granular access control per project with role-based permissions
- **Search & Filter**: Advanced project discovery and organization

### 🔧 **Git Integration**
- **Git History**: View recent commit logs (last 10 commits) with hash, author, date, and message
- **Branch Management**: List all branches and switch between them
- **Commit Operations**: Revert to specific commits with git checkout
- **Pull Updates**: Fetch latest changes from remote branches
- **Repository Context**: Git operations scoped to project working directory

### ⚙️ **Staging & Execution System**
- **Multi-Stage Pipelines**: Define deployment workflows with sequential stage execution
- **Custom Script Execution**: Run bash/cmd scripts with argument substitution
- **Variable System**: Define and pass variables between stages using `#DEFINE` syntax
- **Fail-Fast Execution**: Stages execute in order, stopping on first failure
- **Real-time Streaming**: Live execution output via Server-Sent Events

### 👥 **User Management & Security**
- **Role-Based Access Control**: Admin, User, and Viewer roles (15+ permission types)
- **Project-Level Permissions**: View, Execute, and Admin access per project
- **JWT Authentication**: Secure token-based sessions with 24-hour expiry
- **Password Management**: Bcrypt hashing with change password functionality

### 📊 **Execution History & Monitoring**
- **Complete Audit Trail**: All executions logged with user, project, and stage context
- **Performance Tracking**: Execution duration, exit codes, and status monitoring
- **Output Preservation**: Full stdout/stderr capture and retrieval
- **User-Scoped History**: Users see their own executions, admins see all
- **Automatic Cleanup**: Old execution records purged after 30+ days

### 🎨 **Modern User Interface**
- **SvelteKit Frontend**: Responsive design with TailwindCSS styling
- **Dark/Light Theme**: Toggle between theme preferences with system detection
- **Monaco Code Editor**: Syntax highlighting and IntelliSense for script editing
- **Streaming Console**: Real-time execution output with SSE
- **Keyboard Shortcuts**: Ctrl+K (search), Ctrl+N (new project), Ctrl+E (execute)

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** v16.0.0 or later
- **npm** v8.0.0 or later  
- **Git** v2.20.0 or later
- **SQLite3** (included with Node.js)

### Quick Start Installation

```bash
# 1. Clone the repository
git clone https://github.com/safra36/gum.git
cd gum

# 2. Install all dependencies (both backend and frontend)
# Backend setup
cd backend
npm install

# Frontend setup  
cd ../frontend
npm install
cd ..
```

### Environment Configuration

#### Backend Configuration
Create authentication configuration file:
```bash
cd backend/src/authentication
cp access.json.example access.json
```

Edit `access.json` to configure your initial admin user:
```json
{
  "users": [
    {
      "username": "admin",
      "password": "admin123",
      "role": "admin",
      "email": "admin@example.com"
    }
  ]
}
```

**Note**: Default credentials are `admin/admin123`. Change these immediately after first login.

#### Frontend Configuration
Create environment configuration:
```bash
cd frontend
echo "PUBLIC_BASE_URL=http://localhost:3000" > .env
```

For production environments:
```bash
echo "PUBLIC_BASE_URL=https://your-production-domain.com" > .env
```

### Database Setup

The application uses SQLite with TypeORM. The database will be automatically created on first run:

```bash
cd backend
npm start
# Database will be created at backend/database.sqlite
```

### Development Setup

#### Terminal 1 - Backend Server
```bash
cd backend
npm start
# Server starts on http://localhost:3000
```

#### Terminal 2 - Frontend Development Server
```bash
cd frontend
npm run dev
# Development server starts on http://localhost:5173
```

### Production Deployment

#### Build Frontend
```bash
cd frontend
npm run build
npm run preview
# Production preview on http://localhost:4173
```

#### Production Backend
```bash
cd backend
npm start
# Backend runs on port 3000
```

### Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173 (development) or http://localhost:4173 (production)
- **Backend API**: http://localhost:3000
- **Default Login**: username: `admin`, password: `admin123`

## 📖 Complete Usage Guide

### 🚀 Getting Started - First Time Setup

#### 1. Initial Login
```bash
# Start the application
cd backend && npm start &
cd frontend && npm run dev

# Navigate to http://localhost:5173
# Login with your configured admin credentials
```

#### 2. User Management (Admin Only)
Navigate to `/manage` to access user management:
```typescript
// Example user creation via UI
{
  username: "developer1",
  email: "dev@company.com", 
  role: "user",  // admin | user | viewer
  permissions: ["execute", "view", "edit"]
}
```

### 📋 Project Management

#### Creating a Comprehensive Project
```javascript
// Example project configuration
{
  title: "Production Web App Deployment",
  working_dir: "/var/www/myapp",
  stagingConfig: {
    route: "deploy-webapp",
    args: ["production", "--verbose"],
    stages: [
      {
        stageId: "prepare",
        script: `
          echo "Preparing deployment environment..."
          export NODE_ENV=production
          export BUILD_ID=$(date +%Y%m%d-%H%M%S)
          mkdir -p logs
        `
      },
      {
        stageId: "build", 
        script: `
          echo "Building application..."
          npm ci --production
          npm run build
          tar -czf build-$BUILD_ID.tar.gz dist/
        `
      },
      {
        stageId: "deploy",
        script: `
          echo "Deploying to production..."
          systemctl stop myapp
          cp -r dist/* /var/www/myapp/
          systemctl start myapp
          echo "Deployment completed successfully!"
        `
      }
    ]
  }
}
```

#### Project Creation Steps
1. **Navigate to Dashboard**: Access main project view
2. **Click "New Project"**: Opens project creation form
3. **Fill Project Details**:
   - **Title**: Descriptive project name
   - **Working Directory**: Absolute path to project location
   - **Staging Route**: Unique identifier for API access
4. **Configure Stages**: Add multiple stages with custom scripts
5. **Set Permissions**: Assign user access levels per project

### ⚙️ Advanced Staging Configuration

#### Multi-Stage Deployment Example
```bash
# Stage 1: Environment Setup
#!/bin/bash
echo "=== Environment Setup ==="
#DEFINE APP_VERSION=v2.1.0
#DEFINE DEPLOY_ENV=production
echo "App version: #APP_VERSION"
echo "Deploy environment: #DEPLOY_ENV"

# Stage 2: Pre-deployment Checks  
#!/bin/bash
echo "=== Pre-deployment Validation ==="
echo "Validating environment: #DEPLOY_ENV"
echo "Target version: #APP_VERSION"

# Check system requirements
if [ ! -d "/var/www" ]; then
  echo "ERROR: /var/www directory not found"
  exit 1
fi

echo "Pre-deployment checks passed ✓"

# Stage 3: Application Deployment
#!/bin/bash
echo "=== Application Deployment ==="
echo "Deploying #APP_VERSION to #DEPLOY_ENV"

# Create backup
BACKUP_DIR="/var/backups/app-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
echo "Backup created: $BACKUP_DIR"

# Simulate deployment
echo "Installing version #APP_VERSION..."
sleep 2
echo "Configuring for #DEPLOY_ENV environment..."
sleep 1
echo "Starting services..."
sleep 1

echo "Deployment of #APP_VERSION completed successfully! ✓"
```

### 🔧 Git Operations

#### Git Workflow Examples
Available Git operations in the UI:

1. **View Recent Commits**: Displays last 10 commits with hash, author, date, and message
2. **List Branches**: Shows all available branches with current branch highlighted  
3. **Switch Branches**: Change to a different branch via dropdown selection
4. **Revert to Commit**: Reset HEAD to a specific commit hash

#### Git Integration Examples
1. **Pre-deployment Branch Check**:
   ```bash
   CURRENT_BRANCH=$(git branch --show-current)
   if [ "$CURRENT_BRANCH" != "main" ]; then
     echo "ERROR: Not on main branch ($CURRENT_BRANCH)"
     exit 1
   fi
   ```

2. **Automated Tagging**:
   ```bash
   git tag -a "deploy-$(date +%Y%m%d-%H%M%S)" -m "Production deployment"
   git push origin --tags
   ```

### 📊 Execution Monitoring

#### Real-time Execution Features
- **Live Console Output**: Stream command execution in real-time
- **Progress Tracking**: Visual progress indicators for multi-stage deployments  
- **Error Handling**: Automatic capture of exit codes and error outputs
- **Performance Metrics**: Execution duration and resource usage

#### Execution History API
```javascript
// Fetch execution history
GET /api/execution-history?projectId=123&limit=50

// Example response
{
  "executions": [
    {
      "id": 1,
      "projectId": 123,
      "userId": 5,
      "status": "success",
      "command": "deploy-webapp production --verbose",
      "workingDirectory": "/var/www/myapp",
      "duration": 45230,  // milliseconds
      "executedAt": "2024-01-15T14:30:00Z",
      "finishedAt": "2024-01-15T14:30:45Z",
      "output": "Deployment completed successfully!",
      "exitCode": 0
    }
  ]
}
```

### 👥 Permission Management

#### Role-Based Access Control
```typescript
// User Roles and Capabilities
enum UserRole {
  ADMIN = "admin",    // Full system access
  USER = "user",      // Project execution and viewing  
  VIEWER = "viewer"   // Read-only access
}

// Project-Level Permissions
enum PermissionType {
  EXECUTE = "execute",                    // Run staging configurations
  VIEW = "view",                         // View project details
  EDIT = "edit",                         // Modify project settings
  VIEW_LOGS = "view_logs",               // Access execution logs
  VIEW_EXECUTION_HISTORY = "view_execution_history"  // Access historical data
}
```

#### Managing User Permissions
```javascript
// Grant specific permissions to user for project
POST /api/permissions
{
  "userId": 123,
  "projectId": 456, 
  "permissions": ["execute", "view", "view_logs"]
}

// Bulk permission update
PUT /api/users/123/permissions
{
  "globalPermissions": ["view", "execute"],
  "projectPermissions": {
    "456": ["edit", "view_logs"],
    "789": ["view"]
  }
}
```

### 🔄 Scheduled Deployments (Cron Jobs)

#### Setting up Automated Deployments
Each project can have a cron schedule configured through the UI or API:

**Via Project Settings UI:**
1. Open a project
2. Navigate to the Cron tab
3. Set schedule using presets (hourly, daily, weekly, monthly) or custom cron expression
4. Save configuration

**Via API:**
```javascript
// Configure cron job for project
POST /api/projects/123/cron
{
  "cronExpression": "0 2 * * 1-5"  // Monday to Friday at 2 AM
}
```

#### Cron Expression Examples
```bash
# Every day at midnight
"0 0 * * *"

# Every weekday at 6 PM  
"0 18 * * 1-5"

# Every 30 minutes during business hours
"*/30 9-17 * * 1-5"

# First day of every month at 3 AM
"0 3 1 * *"
```

## 🔍 Troubleshooting

### Common Issues

#### Backend Connection Issues
```bash
# Check if backend is running
curl -I http://localhost:3000/health

# Check backend logs in terminal where you ran npm start
```

#### Frontend Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run check

# Test production build
npm run build && npm run preview
```

#### Database Issues
```bash
# Reset database (development only)
cd backend
rm database.sqlite
npm start  # Will recreate database
```

## 🏗️ Technology Stack

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with TypeORM (7 entities)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Real-time**: Server-Sent Events for streaming execution output
- **Process Management**: Node.js child processes for script execution
- **Scheduling**: Node-cron for automated project execution

### Frontend
- **Framework**: SvelteKit with TypeScript
- **Styling**: Tailwind CSS with responsive design
- **Icons**: Lucide Svelte icon library
- **Code Editor**: Monaco Editor with syntax highlighting
- **State Management**: Svelte stores (theme, toast, user)
- **API Communication**: Fetch API with centralized service layer

### Key Libraries
- **Backend**: typeorm, bcrypt, jsonwebtoken, cors, cron
- **Frontend**: @sveltejs/kit, tailwindcss, monaco-editor, lucide-svelte

## 📝 API Reference

### Core API Endpoints

#### Authentication
```bash
POST /login                    # User login
POST /verify                   # Verify JWT token
GET  /me                      # Get current user info
PUT  /change-password         # Change user password
```

#### Project Management
```bash
GET  /project                 # List all projects
POST /project                 # Create new project
PUT  /project/:id             # Update project
GET  /project/:id/stages      # Get project stages
POST /execute-project/:id     # Execute project synchronously
GET  /execute-stream/:id      # Execute project with streaming output
```

#### Git Operations
```bash
GET  /project/:id/branches      # List Git branches
POST /project/:id/switch-branch # Switch to branch
GET  /project/:id/gitlog        # Get Git commit history (last 10)
POST /project/:id/revert-commit # Revert to specific commit
```

#### Cron Job Management
```bash
GET    /project/:id/cron      # Get project cron job
POST   /project/:id/cron      # Set/update cron job
DELETE /project/:id/cron      # Remove cron job
```

#### User Management (Admin only)
```bash
GET  /users                   # List all users
POST /users                   # Create user
PUT  /users/:id               # Update user
GET  /project-permissions     # Get project permissions
POST /project-permissions     # Set project permissions
```

#### Execution History
```bash
GET /execution-history        # Get execution history (paginated)
GET /execution-stream/:id     # Stream live execution output
```

## ⚠️ Current Limitations

### Not Yet Implemented
- **Project Deletion**: Projects can only be created and updated, not deleted
- **Concurrent Executions**: Only one execution allowed globally at a time
- **Stage-Level Permissions**: Permissions are project-level only
- **Email Notifications**: No notification system for execution results
- **Advanced Git Operations**: No push, merge, or complex Git workflows
- **Secrets Management**: No encrypted storage for sensitive variables
- **Resource Monitoring**: No CPU/memory usage tracking during execution
- **Multi-Environment Support**: Single environment deployment only

### Known Issues
- **Database**: SQLite may not be suitable for high-concurrency scenarios
- **File Uploads**: No built-in file upload/transfer capabilities
- **Backup/Restore**: No automated database backup functionality
- **Logging**: Execution logs are stored in database without rotation limits

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install` (in both backend and frontend)
4. Make your changes and test thoroughly
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write unit tests for new features
- Update documentation for API changes

### Testing
Currently no automated tests are implemented. Manual testing is recommended:
- Test project creation and execution
- Verify Git operations work in your repositories
- Test user management and permissions
- Validate cron job scheduling

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive guides and API reference
- **Community**: Join our discussions and share experiences

---

**GUM - Git Unified Manager** - Streamlining deployment workflows with enterprise-grade reliability.