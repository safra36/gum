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

// Add a new function to update a stage
export async function updateStage(stageId: number, stageData: Partial<Stage>): Promise<Stage> {
    const response = await fetch(`${PUBLIC_BASE_URL}/stage/${stageId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(stageData),
    });
    if (!response.ok) {
        throw new Error('Failed to update stage');
    }
    return response.json();
}

// Add a new function to check the health of the API
export async function checkHealth(): Promise<{ status: string }> {
    const response = await fetch(`${PUBLIC_BASE_URL}/health`);
    if (!response.ok) {
        throw new Error('API health check failed');
    }
    return response.json();
}