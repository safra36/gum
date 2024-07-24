import { AppDataSource } from "../data-source";
import { Project } from "../entity/Project";
import { StagingConfig } from "../entity/StagingConfig";
import { Stage } from "../entity/Stage";
import { CreateProject, CreateStagingConfig, CreateStage, UpdateStageDTO, UpdateProjectDTO, ExecutionResult } from "../types/project.service";
import { CronJob } from "cron";
import { ExecutorService } from "./executor.service";
import { CronJobManager } from "./cronjob-manager.service";

export class ProjectService {

    private static instance: ProjectService;
    private cronJobs: Map<number, CronJob> = new Map();

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

            savedStagingConfig.stages = dto.stagingConfig.stages.map((stageDto, index) => {
                const stage = new Stage();
                stage.script = stageDto.script;
                stage.stageId = stageDto.stageId;
                stage.stagingConfig = savedStagingConfig;
                // to preserve order of creating
                stage.created_at = Date.now() + +index
                return stage;
                // return await AppDataSource.manager.save(stage);
            })

            const stages = await AppDataSource.getRepository(StagingConfig).save(savedStagingConfig)

            /* const stages = await Promise.all(dto.stagingConfig.stages.map(async (stageDto) => {
                const stage = new Stage();
                stage.script = stageDto.script;
                stage.stageId = stageDto.stageId;
                stage.stagingConfig = savedStagingConfig;
                return await AppDataSource.manager.save(stage);
            })); */

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

        // Update basic project details
        if (updateData.title !== undefined) project.title = updateData.title;
        if (updateData.working_dir !== undefined) project.working_dir = updateData.working_dir;

        // Update staging config
        if (updateData.stagingConfig) {
            if (!project.stagingConfig) {
                project.stagingConfig = new StagingConfig();
            }
            if (updateData.stagingConfig.route !== undefined) project.stagingConfig.route = updateData.stagingConfig.route;
            if (updateData.stagingConfig.args !== undefined) project.stagingConfig.args = updateData.stagingConfig.args;

            // Update stages
            if (updateData.stagingConfig.stages) {
                project.stagingConfig.stages = updateData.stagingConfig.stages.map(stageData => {
                    const existingStage = project.stagingConfig.stages.find(s => s.id === stageData.id);
                    if (existingStage) {
                        if (stageData.script !== undefined) existingStage.script = stageData.script;
                        if (stageData.stageId !== undefined) existingStage.stageId = stageData.stageId;
                        return existingStage;
                    } else {
                        const newStage = new Stage();
                        newStage.script = stageData.script;
                        newStage.stageId = stageData.stageId;
                        newStage.stagingConfig = project.stagingConfig;
                        return newStage;
                    }
                });
            }
        }

        // Update cron job
        if (updateData.cronJob !== undefined) {
            project.cronJob = updateData.cronJob;
            const cronJobManager = CronJobManager.getInstance();
            cronJobManager.updateCronJob(project);
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
            order : {
                stagingConfig : {
                    stages : {
                        created_at : "ASC",
                        id : "ASC"
                    }
                }
            },
            relations: {
                stagingConfig : {
                    stages : true
                }
            }
        });
    }


    public async setCronJob(projectId: number, cronExpression: string): Promise<Project> {
        const projectRepository = AppDataSource.getRepository(Project);
        const project = await projectRepository.findOne({ where: { id: projectId }, relations : {

            stagingConfig : {
                stages : true
            }

        } });

        if (!project) {
            throw new Error('Project not found');
        }

        project.cronJob = cronExpression;
        const updatedProject = await projectRepository.save(project);

        // Stop existing cron job if it exists
        this.stopCronJob(projectId);

        // Start new cron job
        this.startCronJob(updatedProject);

        return updatedProject;
    }

    public async getCronJob(projectId: number): Promise<string | null> {
        const projectRepository = AppDataSource.getRepository(Project);
        const project = await projectRepository.findOne({ where: { id: projectId } });

        if (!project) {
            throw new Error('Project not found');
        }

        return project.cronJob;
    }

    private startCronJob(project: Project): void {
        if (project.cronJob) {
            const job = new CronJob(project.cronJob, () => {
                // Execute the project's staging config
                this.executeProjectStaging(project.id);
            });

            job.start();
            this.cronJobs.set(project.id, job);
        }
    }

    private stopCronJob(projectId: number): void {
        const existingJob = this.cronJobs.get(projectId);
        if (existingJob) {
            existingJob.stop();
            this.cronJobs.delete(projectId);
        }
    }

    public async executeProjectStaging(projectId: number): Promise<void> {
        console.log(`Executing staging for project ${projectId}`);
        
        try {
            // 1. Fetch the project
            const project: Project = await this.getProjectById(projectId);
            if (!project) {
                throw new Error(`Project with id ${projectId} not found`);
            }

            // 2. Get the staging configuration
            const stagingConfig = project.stagingConfig;
            if (!stagingConfig) {
                throw new Error(`No staging configuration found for project ${projectId}`);
            }

            // 3. Execute each stage in the staging configuration
            const executorService = ExecutorService.getInstance();
            const results: ExecutionResult[] = [];
            let failed = false;

            for (const stage of stagingConfig.stages) {
                if (failed) {
                    results.push({
                        stageId: stage.stageId,
                        stdout: "",
                        stderr: "Skipped due to previous stage failure",
                        exitCode: null
                    });
                } else {
                    try {
                        console.log(`Executing stage ${stage.stageId} for project ${projectId}`);
                        const result = await executorService.executeScript(stage.script, stagingConfig.args);
                        results.push({
                            stageId: stage.stageId,
                            ...result
                        });

                        if (result.exitCode !== 0) {
                            failed = true;
                        }
                    } catch (error) {
                        results.push({
                            stageId: stage.stageId,
                            stdout: "",
                            stderr: error instanceof Error ? error.message : String(error),
                            exitCode: 1
                        });
                        failed = true;
                    }
                }
            }

            // 4. Log the results
            console.log(`Staging execution completed for project ${projectId}`);
            console.log(`Success: ${!failed}`);
            console.log(`Results:`, JSON.stringify(results, null, 2));

            // 5. Optionally, you could store these results in a database or send notifications
            // await this.storeExecutionResults(projectId, results);
            // await this.sendNotification(projectId, !failed, results);

        } catch (error) {
            console.error(`Error executing staging for project ${projectId}:`, error);
            // Optionally, you could send an error notification here
            // await this.sendErrorNotification(projectId, error);
        }
    }

    public async removeCronJob(projectId: number): Promise<Project> {
        const projectRepository = AppDataSource.getRepository(Project);
        const project = await projectRepository.findOne({ where: { id: projectId }, relations : {
            stagingConfig : {
                stages : true
            }
        } });

        if (!project) {
            throw new Error('Project not found');
        }

        project.cronJob = null;
        const updatedProject = await projectRepository.save(project);

        // Stop the cron job
        const cronJobManager = CronJobManager.getInstance();
        cronJobManager.stopCronJob(projectId);

        return updatedProject;
    }
}