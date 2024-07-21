# Deployment Management Panel

A powerful web-based tool for managing deployment projects, Git repositories, and executing staging configurations.

## Features

- **Project Management**: Create, edit, and view deployment projects
- **Git Integration**: 
  - View Git logs
  - List and switch between branches
  - Revert to specific commits
- **Staging Configuration**: Set up and execute multi-stage deployment processes
- **Real-time Execution**: Run staging configurations and view results in real-time
- **User-friendly Interface**: Clean, responsive design with intuitive controls

## Getting Started

### Prerequisites

- Node.js (v16 or later recommended)
- npm (v6 or later)
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/gum.git
   cd gum
   ```

2. Install dependencies for both backend and frontend:
   ```
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the frontend directory and add the following:
   ```
   PUBLIC_BASE_URL=http://localhost:3000
   ```

### Running the Application

The backend and frontend have different running strategies:

#### Backend (GUM)

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Start the backend server:
   ```
   npm start
   ```
   This will run the `ts-node src/main.ts` command, starting the backend server.

#### Frontend

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. For development:
   ```
   npm run dev
   ```
   This will start the development server with hot-reloading.

3. For production build:
   ```
   npm run build
   npm run preview
   ```
   This will create a production build and start a server to preview it.

4. Open your browser and navigate to the URL provided by the frontend server (usually `http://localhost:5173` for development or `http://localhost:4173` for preview)

## Usage Guide

### Creating a New Project

1. Click the "New Project" button in the top right corner
2. Fill in the project details:
   - Title
   - Working Directory
   - Staging Configuration (Route, Arguments, Stages)
3. Click "Create Project"

### Viewing Project Details

1. Select a project from the list on the left
2. The main panel will display project details, including:
   - Working Directory
   - Staging Configuration
   - Git information

### Executing Staging

1. Open a project
2. Click the "Execute Staging" button in the Project Toolbox
3. View real-time execution results

### Managing Git

1. Open a project
2. Use the "Load Git Log" and "Load Branches" buttons in the Project Toolbox
3. To switch branches, click the "Switch" button next to a branch name
4. To revert to a specific commit, find the commit in the Git Log and click "Revert"

### Editing a Project

1. Open a project
2. Click the "Edit Project" button
3. Modify the project details
4. Click "Update Project" to save changes

## Troubleshooting

- If you encounter connection issues, ensure the backend server is running on port 3000 and the `PUBLIC_BASE_URL` in your frontend `.env` file is set to `http://localhost:3000`
- For Git-related errors, verify that the working directory is a valid Git repository
- Check the browser console and server logs for detailed error messages
- If you're having issues with TypeORM, you can use the `typeorm` script in the backend: `npm run typeorm -- [TypeORM CLI commands]`

## Development

- Backend uses TypeScript with Express and TypeORM
- Frontend is built with SvelteKit and uses Tailwind CSS for styling
- Lucide icons are used for the UI

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you need help or have any questions, please open an issue on our GitHub repository.