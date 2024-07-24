


export interface ServerConfig {
    port: number;
    routes: RouteConfig[];
}

export interface RouteConfig {
    route: string;
    handler: Function;
    method: 'get' | 'post' | 'put' | 'delete';
}

export interface StageDTO {
    id: number;
    script: string;
    stageId: string;
}

export interface StagingConfigDTO {
    id: number;
    route: string;
    args: string[];
    stages: StageDTO[];
}

export interface ProjectDTO {
    id: number;
    title: string;
    working_dir: string;
    stagingConfigs: StagingConfigDTO;
    cronJob: string | null; // Added cronJob field
}