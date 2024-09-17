// src/services/api.ts

import { PUBLIC_BASE_URL } from "$env/static/public";
import type { Project, ExecutionResult, GitLogEntry, Stage, LoginResponseDto, LoginRequestDto } from "$lib/types";
import { authToken } from "../../stores";


let token : string = "";
authToken.subscribe((authToken) => {

    console.log(token, authToken);
    
    token = authToken
})


export async function loginUser(dto : LoginRequestDto) {


    const response = await fetch(`${PUBLIC_BASE_URL}/login`, {
        method : "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
    })

    if(!response.ok) {
        throw new Error("login failed")
    }

    const responseDto = await response.json() as unknown as LoginResponseDto;

    console.log(responseDto);
    
    if(!responseDto?.access_token) throw new Error("unable to login");
    authToken.set(responseDto.access_token)

}



export async function verifyUser() {


    console.log(token);
    

    const response = await fetch(`${PUBLIC_BASE_URL}/verify`, {
        method : "GET",
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('failed to authenticate');
    }
    return response.text();

}

export async function fetchProjects(): Promise<Project[]> {
    const response = await fetch(`${PUBLIC_BASE_URL}/stages`, {
        method : "GET",
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch projects');
    }
    return response.json();
}

export async function fetchProjectDetails(id: number): Promise<Project> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${id}`, {
        method : "GET",
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch project details');
    }
    return response.json();
}

export async function executeStaging(route: string): Promise<{ success: boolean, message: string, project: string, results: ExecutionResult[] }> {
    const response = await fetch(`${PUBLIC_BASE_URL}${route}`, {
        method : "GET",
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        (error as any).response = response;
        throw error;
    }
    return response.json();
}

export async function fetchGitLog(projectId: number): Promise<GitLogEntry[]> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/gitlog`, {
        method : "GET",
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });

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
            "Authorization" : `Bearer ${token}`
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
            "Authorization" : `Bearer ${token}`
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
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/branches`, {
        method : "GET",
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });

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
            "Authorization" : `Bearer ${token}`
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
            "Authorization" : `Bearer ${token}`
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
            "Authorization" : `Bearer ${token}`
        },
        body: JSON.stringify({ branch }),
    });
    if (!response.ok) {
        throw new Error('Failed to switch to branch head');
    }
}


export async function setCronJob(projectId: number, cronExpression: string): Promise<void> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/cron`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization" : `Bearer ${token}`
        },
        body: JSON.stringify({ cronExpression }),
    });

    if (!response.ok) {
        throw new Error('Failed to set cron job');
    }
}


export async function getCronJob(projectId: number): Promise<string> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/cron`, {
        method : "GET",
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to get cron job');
    }
    const data = await response.json();
    return data.cronJob;
}

export async function removeCronJob(projectId: number): Promise<void> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project/${projectId}/cron`, {
        method: 'DELETE',
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to remove cron job');
    }
}
