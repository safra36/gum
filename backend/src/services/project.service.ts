import { AppDataSource } from "../data-source";
import { Project } from "../entity/Project";
import { StagingConfig } from "../entity/StagingConfig";
import { Stage } from "../entity/Stage";
import { CreateProject, CreateStagingConfig, CreateStage, UpdateStageDTO, UpdateProjectDTO } from "../types/project.service";

export class ProjectService {
    private static instance: ProjectService;

    private constructor() { }

    public static getInstance(): ProjectService {
        if (!ProjectService.instance) {
            ProjectService.instance = new ProjectService();
        }
        return ProjectService.instance;
    }

    private async checkRouteExists(route: string): Promise<boolean> {
        const existingConfig = await AppDataSource.getRepository(StagingConfig)
            .createQueryBuilder("stagingConfig")
            .where("stagingConfig.route = :route", { route })
            .getOne();

        return !!existingConfig;
    }

    public async createProject(dto: CreateProject): Promise<Project> {
        const project = new Project();
        project.title = dto.title;
        project.working_dir = dto.working_dir;

        // Save the project first
        const savedProject = await AppDataSource.manager.save(project);

        try {
            // Check if the route already exists
            const routeExists = await this.checkRouteExists(dto.stagingConfig.route);
            if (routeExists) {
                throw new Error(`Route '${dto.stagingConfig.route}' already exists`);
            }

            const stagingConfig = new StagingConfig();
            stagingConfig.route = dto.stagingConfig.route;
            stagingConfig.args = dto.stagingConfig.args;
            stagingConfig.project = savedProject;

            const savedStagingConfig = await AppDataSource.manager.save(stagingConfig);

            // Create and save stages
            const stages = await Promise.all(dto.stagingConfig.stages.map(async (stageDto) => {
                const stage = new Stage();
                stage.script = stageDto.script;
                stage.stageId = stageDto.stageId;
                stage.stagingConfig = savedStagingConfig;
                return await AppDataSource.manager.save(stage);
            }));

            savedStagingConfig.stages = stages;
            savedProject.stagingConfig = savedStagingConfig;

            await AppDataSource.manager.save(savedProject);
        } catch (error) {
            // If there's an error, delete the project and rethrow
            await AppDataSource.manager.remove(savedProject);
            throw error;
        }

        // Return the project without circular references
        return this.getProjectById(savedProject.id);
    }

    public async updateProject(projectId: number, updateData: UpdateProjectDTO): Promise<Project> {
        const projectRepository = AppDataSource.getRepository(Project);
        const project = await projectRepository.findOne({
            where: { id: projectId },
            relations: ['stagingConfig', 'stagingConfig.stages']
        });

        if (!project) {
            throw new Error('Project not found');
        }

        // Update project details
        project.title = updateData.title;
        project.working_dir = updateData.working_dir;

        // Update staging config
        if (updateData.stagingConfig) {
            if (!project.stagingConfig) {
                project.stagingConfig = new StagingConfig();
            }
            project.stagingConfig.route = updateData.stagingConfig.route;
            project.stagingConfig.args = updateData.stagingConfig.args;

            // Update stages
            const updatedStages = updateData.stagingConfig.stages.map(stageData => {
                const existingStage = project.stagingConfig.stages.find(s => s.id === stageData.id);
                if (existingStage) {
                    existingStage.script = stageData.script;
                    existingStage.stageId = stageData.stageId;
                    return existingStage;
                } else {
                    const newStage = new Stage();
                    newStage.script = stageData.script;
                    newStage.stageId = stageData.stageId;
                    newStage.stagingConfig = project.stagingConfig;
                    return newStage;
                }
            });

            project.stagingConfig.stages = updatedStages;
        }

        return await projectRepository.save(project);
    }

    public async updateStage(stageId: number, updateData: UpdateStageDTO): Promise<Stage> {
        const stageRepository = AppDataSource.getRepository(Stage);
        const stage = await stageRepository.findOne({ where: { id: stageId } });

        if (!stage) {
            throw new Error('Stage not found');
        }

        stage.script = updateData.script;
        stage.stageId = updateData.stageId;

        return await stageRepository.save(stage);
    }

    public async getProjectById(id: number): Promise<Project> {
        return await AppDataSource.manager.findOne(Project, {
            where: { id },
            relations: ['stagingConfig', 'stagingConfig.stages']
        });
    }

    public async getAllProjects(): Promise<Project[]> {
        return await AppDataSource.manager.find(Project, {
            relations: ['stagingConfig', 'stagingConfig.stages']
        });
    }
}