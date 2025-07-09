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
    console.log('Verifying user with token:', token);
    
    const response = await fetch(`${PUBLIC_BASE_URL}/verify`, {
        method : "GET",
        headers : {
            "Authorization" : `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('failed to authenticate');
    }
    return response.json(); // Changed from response.text() to response.json()
}

export async function getUserProfile() {
    console.log('Fetching user profile with token:', token);
    
    const response = await fetch(`${PUBLIC_BASE_URL}/me`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch user profile');
    }
    return response.json();
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

export async function executeProject(projectId: number): Promise<{ success: boolean, message: string, project: string, results: ExecutionResult[] }> {
    const response = await fetch(`${PUBLIC_BASE_URL}/execute-project`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ projectId })
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
export async function createProject(project: Omit<Project, 'id'>): Promise<{ message: string, project: Project }> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization" : `Bearer ${token}`
        },
        body: JSON.stringify(project),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to create project');
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

// User Management API functions
export async function getUsers(): Promise<any[]> {
    const response = await fetch(`${PUBLIC_BASE_URL}/users`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }
    return response.json();
}

export async function createUser(userData: {
    username: string;
    password: string;
    email?: string;
    role?: string;
    permissions?: string[];
}): Promise<any> {
    const response = await fetch(`${PUBLIC_BASE_URL}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        throw new Error('Failed to create user');
    }
    return response.json();
}

export async function updateUser(userId: number, userData: {
    username?: string;
    password?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    isActive?: boolean;
}): Promise<any> {
    const response = await fetch(`${PUBLIC_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        throw new Error('Failed to update user');
    }
    return response.json();
}

export async function deleteUser(userId: number): Promise<void> {
    const response = await fetch(`${PUBLIC_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to delete user');
    }
}

// Execution History API functions
export async function getExecutionHistory(queryParams?: string): Promise<any> {
    const url = queryParams ? 
        `${PUBLIC_BASE_URL}/execution-history?${queryParams}` : 
        `${PUBLIC_BASE_URL}/execution-history`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch execution history');
    }
    return response.json();
}

export async function getExecutionById(executionId: number): Promise<any> {
    const response = await fetch(`${PUBLIC_BASE_URL}/execution-history/${executionId}`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch execution details');
    }
    return response.json();
}

// Password change function
export async function changePassword(currentPassword: string, newPassword: string): Promise<any> {
    const response = await fetch(`${PUBLIC_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            currentPassword,
            newPassword
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to change password');
    }
    return response.json();
}

// Streaming execution functions
export async function executeStreamingScript(script: string, args: string[] = [], projectId?: number, stageId?: number): Promise<string> {
    const response = await fetch(`${PUBLIC_BASE_URL}/execute-stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            projectId,
            stageId
        })
    });

    if (!response.ok) {
        try {
            const errorData = await response.json();
            // Check if it's a permission error or other specific error
            if (response.status === 403) {
                throw new Error(errorData.details || errorData.error || 'Permission denied');
            } else if (response.status === 401) {
                throw new Error('Authentication required');
            } else {
                throw new Error(errorData.details || errorData.error || `HTTP error ${response.status}`);
            }
        } catch (jsonError) {
            // If we can't parse JSON, fall back to generic message with status
            throw new Error(`Failed to start streaming execution (${response.status})`);
        }
    }
    
    const data = await response.json();
    return data.executionId;
}

export function createExecutionStream(executionId: string): EventSource {
    const eventSource = new EventSource(`${PUBLIC_BASE_URL}/execution-stream/${executionId}?token=${encodeURIComponent(token)}`);
    
    return eventSource;
}

// Project Permission API functions
export async function getUserProjectPermissions(userId: number): Promise<any[]> {
    const response = await fetch(`${PUBLIC_BASE_URL}/users/${userId}/project-permissions`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch user project permissions');
    }
    return response.json();
}

export async function setUserProjectPermissions(userId: number, projectPermissions: Array<{ projectId: number; accessLevel: string }>): Promise<void> {
    const response = await fetch(`${PUBLIC_BASE_URL}/users/${userId}/project-permissions`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ projectPermissions })
    });

    if (!response.ok) {
        throw new Error('Failed to set user project permissions');
    }
}

export async function grantProjectAccess(userId: number, projectId: number, accessLevel: string): Promise<any> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project-permissions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, projectId, accessLevel })
    });

    if (!response.ok) {
        throw new Error('Failed to grant project access');
    }
    return response.json();
}

export async function revokeProjectAccess(userId: number, projectId: number): Promise<void> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project-permissions`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, projectId })
    });

    if (!response.ok) {
        throw new Error('Failed to revoke project access');
    }
}

export async function getProjectUsers(projectId: number): Promise<Array<{ user: any; accessLevel: string }>> {
    const response = await fetch(`${PUBLIC_BASE_URL}/projects/${projectId}/users`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch project users');
    }
    return response.json();
}

export async function getAllProjectPermissions(): Promise<any[]> {
    const response = await fetch(`${PUBLIC_BASE_URL}/project-permissions`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch all project permissions');
    }
    return response.json();
}

// Create an object to export all functions
export const api = {
    loginUser,
    verifyUser,
    getUserProfile,
    fetchProjects,
    fetchProjectDetails,
    executeStaging,
    executeProject,
    fetchGitLog,
    createProject,
    updateProject,
    checkHealth,
    fetchGitBranches,
    switchGitBranch,
    revertToCommit,
    switchToHead,
    setCronJob,
    getCronJob,
    removeCronJob,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getExecutionHistory,
    getExecutionById,
    changePassword,
    executeStreamingScript,
    createExecutionStream,
    getUserProjectPermissions,
    setUserProjectPermissions,
    grantProjectAccess,
    revokeProjectAccess,
    getProjectUsers,
    getAllProjectPermissions
};
