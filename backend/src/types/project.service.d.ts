

export interface CreateProject {
    title: string;
    working_dir: string;
    stagingConfig: CreateStagingConfig;
}

export interface CreateStagingConfig {
    route: string;
    args: string[];
    stages: CreateStage[];
}

export interface CreateStage {
    script: string;
    stageId: string;
}

export interface UpdateProjectDTO {
    title?: string;
    working_dir?: string;
    stagingConfig?: {
        route?: string;
        args?: string[];
        stages?: UpdateStageDTO[];
    };
}

export interface UpdateStageDTO {
    id?: number;
    script?: string;
    stageId?: string;
}