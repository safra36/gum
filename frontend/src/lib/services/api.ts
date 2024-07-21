// src/services/api.ts

import { PUBLIC_BASE_URL } from "$env/static/public";
import type { Project, ExecutionResult, GitLogEntry, Stage } from "$lib/types";


export async function fetchProjects(): Promise<Project[]> {
    const response = await fetch(`${PUBLIC_BASE_URL}/stages`);
    if (!response.ok) {
        throw new Error('Failed to fetch projects');
    }
    return response.json();
}

export async function fetchProjectDetails(id: number): Promise<Project> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch project details');
    }
    return response.json();
}

export async function executeStaging(route: string): Promise<{ success: boolean, message: string, project: string, results: ExecutionResult[] }> {
    const response = await fetch(`${PUBLIC_BASE_URL}${route}`);
    if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        (error as any).response = response;
        throw error;
    }
    return response.json();
}

export async function fetchGitLog(projectId: number): Promise<GitLogEntry[]> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/gitlog`);
    if (!response.ok) {
        throw new Error('Failed to fetch git log');
    }
    return response.json();
}

// Add a new function to create a project
export async function createProject(project: Omit<Project, 'id'>): Promise<Project> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
    });
    if (!response.ok) {
        throw new Error('Failed to create project');
    }
    return response.json();
}


export async function updateProject(projectId: number, projectData: Partial<Project>): Promise<Project> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
    });

    if (!response.ok) {
        throw new Error('Failed to update project');
    }

    const result = await response.json();
    return result.project;
}

// Add a new function to check the health of the API
export async function checkHealth(): Promise<{ status: string }> {
    const response = await fetch(`${PUBLIC_BASE_URL}/health`);
    if (!response.ok) {
        throw new Error('API health check failed');
    }
    return response.json();
}



export async function fetchGitBranches(projectId: number): Promise<{ branches: string[], currentBranch: string }> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/branches`);
    if (!response.ok) {
        throw new Error('Failed to fetch git branches');
    }
    return response.json();
}



export async function switchGitBranch(projectId: number, branch: string): Promise<void> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/switch-branch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branch }),
    });
    if (!response.ok) {
        throw new Error('Failed to switch git branch');
    }
}

export async function revertToCommit(projectId: number, commitHash: string): Promise<void> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/revert-commit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commitHash }),
    });
    if (!response.ok) {
        throw new Error('Failed to revert to commit');
    }
}

export async function switchToHead(projectId: number, branch: string): Promise<void> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/switch-to-head`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branch }),
    });
    if (!response.ok) {
        throw new Error('Failed to switch to branch head');
    }
}