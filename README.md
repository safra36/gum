# GUM, another Deployment Management Panel

## Table of Contents
1. [Introduction](#introduction)
2. [Features](#features)
3. [Technologies Used](#technologies-used)
4. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
5. [Usage](#usage)
   - [Creating a New Project](#creating-a-new-project)
   - [Managing Projects](#managing-projects)
   - [Executing Staging](#executing-staging)
6. [Project Structure](#project-structure)
7. [API Endpoints](#api-endpoints)
8. [Contributing](#contributing)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [License](#license)
13. [Contact](#contact)

## Introduction

GUM ( Deployment Management Panel ) is a web-based application designed to streamline the process of managing and executing deployment projects. It provides an intuitive interface for creating, managing, and executing staging configurations for various projects.


![Overview](https://raw.githubusercontent.com/safra36/gum/main/screenshots/overview.png)
![Project Overview](https://raw.githubusercontent.com/safra36/gum/main/screenshots/project-overview.png)
![Adding Project](https://raw.githubusercontent.com/safra36/gum/main/screenshots/adding-project.png)

## Features

- Create and manage multiple deployment projects
- Configure staging settings for each project
- Execute staging processes with real-time feedback
- View and manage project details
- Retrieve and display Git logs for projects
- Responsive design for desktop and mobile use

## Technologies Used

- Frontend:
  - Svelte
  - TypeScript
  - Tailwind CSS
  - Lucide Icons
- Backend:
  - Node.js
  - Express.js
- Database:
  - SQLite

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/safra36/gum.git
   ```

2. Navigate to the project directory:
   ```
   cd gum frontend or cd gum backend 
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your gum backend enpoint URL

5. Start the development server:
   ```
   npm run dev
   ```

## Usage

### Creating a New Project

1. Click on the "New Project" button in the navigation bar.
2. Fill in the project details:
   - Project Title
   - Working Directory
   - Staging Configuration (Route and Arguments)
   - Add one or more Stages with Script and Stage ID
3. Click "Create Project" to save the new project.

### Managing Projects

- View all projects in the sidebar
- Click on a project to view its details
- Edit project details (not implemented)
- Delete projects (not implemented)

### Executing Staging

1. Select a project from the sidebar
2. Review the staging configuration and stages
3. Click "Execute Staging" to run the staging process
4. View real-time results of the staging execution

## Contributing

We welcome contributions to the Deployment Management Panel! Please follow these steps to contribute:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License

## Contact

For any questions or concerns, please open an issue on the GitHub repository.