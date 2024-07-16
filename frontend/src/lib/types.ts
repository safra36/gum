// src/lib/types.ts

export interface Stage {
    id: number;
    script: string;
    stageId: string;
}

export interface StagingConfig {
    id: number;
    route: string;
    args: string[];
    stages: Stage[];
}

export interface Project {
    id: number;
    title: string;
    working_dir: string;
    stagingConfigs: StagingConfig;
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