// src/lib/types.ts

export interface Stage {
    id?: number;  // Make id optional to handle new stages
    script: string;
    stageId: string;
}

export interface StagingConfig {
    id?: number;  // Make id optional for create requests
    route: string;
    args: string[];
    stages: Stage[];
}

export interface Project {
    id: number;
    title: string;
    working_dir: string;
    stagingConfig: StagingConfig;
    cronJob: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ExecutionResult {
    stageId: string;
    stdout: string;
    stderr: string;
    exitCode: number | null;
}


export interface GitLogEntry {
    commit: string;
    author: string;
    date: string;
    message: string;
}




export interface User {
	username: string;
	access: string[];
}


export interface LoginRequestDto {

    username : string,
    password : string

}


export interface LoginResponseDto {

    access_token : string

}