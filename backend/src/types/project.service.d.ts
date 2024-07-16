

export interface CreateStage {
    script: string;
    stageId: string;
}

export interface CreateStagingConfig {
    route: string;
    args: string[];
    stages: CreateStage[];
}

export interface CreateProject {
    title: string;
    working_dir: string;
    stagingConfig: CreateStagingConfig;
}

export interface UpdateStageDTO {
    script: string;
    stageId: string;
}