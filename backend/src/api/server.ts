import path from "path";
import { Project } from "../entity/Project";
import { ExecutorService } from "../services/executor.service";
import { ProjectService } from "../services/project.service";
import { CreateProject, CreateStagingConfig, CreateStage, UpdateStageDTO, UpdateProjectDTO } from "../types/project.service";
import { ServerConfig, RouteConfig, ProjectDTO } from "../types/server-types";
import express, { Request, Response, NextFunction } from 'express';
import cors from "cors"
import { GitLogEntry } from "../types/executor.service";
import { CronJobManager } from "../services/cronjob-manager.service";
import { StateManager } from "../utils/StateManager";

export class APIServer {
    
    private static instance: APIServer;
    private app: express.Application;
    private port: number;
    private server: any;
    private projectService: ProjectService;
    private executorService: ExecutorService;
    private cronJobManager: CronJobManager;

    private constructor() {
        this.app = express();
        this.projectService = ProjectService.getInstance();
        this.cronJobManager = CronJobManager.getInstance();
        this.executorService = ExecutorService.getInstance();
        this.setupMiddleware();
    }

    public static getInstance(): APIServer {
        if (!APIServer.instance) {
            APIServer.instance = new APIServer();
        }
        return APIServer.instance;
    }

    private setupMiddleware(): void {
        this.app.use(cors({
            origin : "*"
        }))
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    public init(config: ServerConfig): void {
        this.port = config.port;
        this.setupDefaultRoutes();
        this.setupRoutes(config.routes);
        this.start();
    }

    private async generateNewConfig(): Promise<ServerConfig> {
        const projects = await this.projectService.getAllProjects();
        const executorService = ExecutorService.getInstance();

        const dynamicRoutes: RouteConfig[] = projects.map(project => {
            const config = project.stagingConfig;
            return {
                method: 'get',
                route: config.route,
                handler: async (req: Request, res: Response) => {


                    if(StateManager.isExecuting) {

                        res.status(400).json({
                            message: `Another script is being executed, please retry again later`,
                            project: project.title,
                            success: false,
                            results: []
                        });

                        return;
    
                    }
    
                    StateManager.isExecuting = true;

                    const results = [];
                    let failed = false;

                    for (const stage of config.stages) {
                        if (failed) {
                            results.push({
                                stageId: stage.stageId,
                                stdout: "",
                                stderr: "Skipped due to previous stage failure",
                                exitCode: null
                            });
                        } else {
                            try {
                                console.log("executing stage", stage.stageId);
                                const result = await executorService.executeScript(stage.script, config.args);
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

                    StateManager.isExecuting = false
                    const status = failed ? 500 : 200;
                    res.status(status).json({
                        message: `Executed route: ${config.route}`,
                        project: project.title,
                        success: !failed,
                        results: results
                    });
                }
            };
        });

        return {
            port: this.port,
            routes: dynamicRoutes
        };
    }

    private setupDefaultRoutes(): void {
        this.app.get('/', (req: Request, res: Response) => {
            res.send('Welcome to the API Server');
        });

        this.app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({ status: 'OK' });
        });

        // Project creation route
        this.app.post('/project', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectData: CreateProject = {
                    title: req.body.title,
                    working_dir: req.body.working_dir,
                    stagingConfig: req.body.stagingConfig
                };
                const createdProject = await this.projectService.createProject(projectData);
                const projectDTO = this.projectToDTO(createdProject);
                
                // Reset routes after project creation
                const newConfig = await this.generateNewConfig();
                this.resetRoutes(newConfig);
                
                res.status(201).json({ message: 'Project created successfully', project: projectDTO });
            } catch (error) {
                res.status(500).json({ error: 'Failed to create project', details: error.message });
            }
        });


        this.app.get('/project/:id/branches', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.id);
                const project = await this.projectService.getProjectById(projectId);

                if (!project) {
                    return res.status(404).json({ error: "Project not found" });
                }

                const executorService = ExecutorService.getInstance();
                const branches = await executorService.getGitBranches(project.working_dir);
                const currentBranch = await executorService.getCurrentGitBranch(project.working_dir);

                res.json({ branches, currentBranch });
            } catch (error) {
                res.status(500).json({
                    error: "Failed to fetch git branches",
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        this.app.post('/project/:id/switch-branch', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.id);
                const { branch } = req.body;

                if (!branch) {
                    return res.status(400).json({ error: "Branch name is required" });
                }

                const project = await this.projectService.getProjectById(projectId);

                if (!project) {
                    return res.status(404).json({ error: "Project not found" });
                }

                const executorService = ExecutorService.getInstance();
                await executorService.switchGitBranch(project.working_dir, branch);

                res.json({ message: `Successfully switched to branch: ${branch}` });
            } catch (error) {
                res.status(500).json({
                    error: "Failed to switch git branch",
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Fetch all stages route
        this.app.get('/stages', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projects = await this.projectService.getAllProjects();
                const projectDTOs = projects.map(this.projectToDTO);
                res.status(200).json(projectDTOs);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch stages', details: error.message });
            }
        });


        this.app.put('/project/:projectId', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.projectId);
                const updateData: UpdateProjectDTO = {
                    title: req.body.title,
                    working_dir: req.body.working_dir,
                    stagingConfig: {
                        route: req.body.stagingConfigs.route,
                        args: req.body.stagingConfigs.args,
                        stages: req.body.stagingConfigs.stages
                    },
                    cronJob: req.body.cronJob
                };
                const updatedProject = await this.projectService.updateProject(projectId, updateData);
                
                // Reset routes after project update
                const newConfig = await this.generateNewConfig();
                this.resetRoutes(newConfig);
                
                const projectDTO = this.projectToDTO(updatedProject);
                res.status(200).json({ message: 'Project updated successfully', project: projectDTO });
            } catch (error) {
                res.status(500).json({ error: 'Failed to update project', details: error.message });
            }
        });

        // Existing stage update route (you might want to keep this for individual stage updates)
        this.app.put('/stage/:stageId', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const stageId = parseInt(req.params.stageId);
                const updateData: UpdateStageDTO = {
                    script: req.body.script,
                    stageId: req.body.stageId
                };
                const updatedStage = await this.projectService.updateStage(stageId, updateData);
                
                // Reset routes after stage update
                const newConfig = await this.generateNewConfig();
                this.resetRoutes(newConfig);
                
                res.status(200).json({ message: 'Stage updated successfully', stage: updatedStage });
            } catch (error) {
                res.status(500).json({ error: 'Failed to update stage', details: error.message });
            }
        });

        this.app.get('/project/:id/gitlog', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.id);
                const project = await this.projectService.getProjectById(projectId);

                if (!project) {
                    return res.status(404).json({ error: "Project not found" });
                }

                const gitLogs: GitLogEntry[] = await this.executorService.extractGitLogs(project.working_dir);

                res.json(gitLogs);

            } catch (error) {
                res.status(500).json({
                    error: "Failed to fetch git log",
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        this.app.post('/project/:id/revert-commit', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.id);
                const { commitHash } = req.body;

                if (!commitHash) {
                    return res.status(400).json({ error: "Commit hash is required" });
                }

                const project = await this.projectService.getProjectById(projectId);

                if (!project) {
                    return res.status(404).json({ error: "Project not found" });
                }

                const executorService = ExecutorService.getInstance();
                await executorService.revertToCommit(project.working_dir, commitHash);

                res.json({ message: `Successfully reverted to commit: ${commitHash}` });
            } catch (error) {
                res.status(500).json({
                    error: "Failed to revert to commit",
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        this.app.post('/project/:id/switch-to-head', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.id);
                const { branch } = req.body;

                if (!branch) {
                    return res.status(400).json({ error: "Branch name is required" });
                }

                const project = await this.projectService.getProjectById(projectId);

                if (!project) {
                    return res.status(404).json({ error: "Project not found" });
                }

                const executorService = ExecutorService.getInstance();
                await executorService.switchToHead(project.working_dir, branch);

                res.json({ message: `Successfully switched to head of branch: ${branch}` });
            } catch (error) {
                res.status(500).json({
                    error: "Failed to switch to branch head",
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });



        this.app.post('/project/:id/cron', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.id);
                const { cronExpression } = req.body;

                if (!cronExpression) {
                    return res.status(400).json({ error: "Cron expression is required" });
                }

                // Get the project
                const project = await this.projectService.getProjectById(projectId);
                if (!project) {
                    return res.status(404).json({ error: "Project not found" });
                }

                // Prepare update data
                const updateData: UpdateProjectDTO = {
                    cronJob: cronExpression
                };

                // Update the project with the new cron expression
                const updatedProject = await this.projectService.updateProject(projectId, updateData);

                // Update the cron job using CronJobManager
                this.cronJobManager.updateCronJob(updatedProject);

                const projectDTO = this.projectToDTO(updatedProject);
                res.status(200).json({ message: 'Cron job set successfully', project: projectDTO });
            } catch (error) {
                console.error('Error setting cron job:', error);
                res.status(500).json({
                    error: "Failed to set cron job",
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // New route to get the current cron job for a project
        this.app.get('/project/:id/cron', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.id);
                const cronJob = await this.projectService.getCronJob(projectId);
                
                res.status(200).json({ cronJob });
            } catch (error) {
                res.status(500).json({
                    error: "Failed to get cron job",
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });



        this.app.delete('/project/:id/cron', this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.id);

                // Get the project
                const project = await this.projectService.getProjectById(projectId);
                if (!project) {
                    return res.status(404).json({ error: "Project not found" });
                }

                // Prepare update data to remove cron job
                const updateData: UpdateProjectDTO = {
                    cronJob: null
                };

                // Update the project to remove the cron job
                const updatedProject = await this.projectService.updateProject(projectId, updateData);

                // Stop the cron job using CronJobManager
                this.cronJobManager.stopCronJob(projectId);

                const projectDTO = this.projectToDTO(updatedProject);
                res.status(200).json({ message: 'Cron job removed successfully', project: projectDTO });
            } catch (error) {
                console.error('Error removing cron job:', error);
                res.status(500).json({
                    error: "Failed to remove cron job",
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });




    }

    private projectToDTO(project: Project): ProjectDTO {

        console.log(project);
        
        return {
            id: project.id,
            title: project.title,
            working_dir: project.working_dir,
            stagingConfigs: {
                id: project.stagingConfig.id,
                route: project.stagingConfig.route,
                args: project.stagingConfig.args,
                stages: project.stagingConfig.stages.map(stage => ({
                    id: stage.id,
                    script: stage.script,
                    stageId: stage.stageId
                }))
            },
            cronJob: project.cronJob // Add this line to include the cronJob in the DTO
        };
    }

    private authenticateRequest(req: Request, res: Response, next: NextFunction): void {
        // Authentication logic (currently commented out)
        next();
    }

    private setupRoutes(routes: RouteConfig[]): void {
        for (const routeObject of routes) {
            console.log(`Setting up route: ${routeObject.method.toUpperCase()} ${routeObject.route}`);
            
            const { method, route, handler } = routeObject;
            this.app[method](
                route,
                (req: Request, res: Response, next: NextFunction) => {
                    try {
                        handler(req, res, next);
                    } catch (error) {
                        next(error);
                    }
                }
            );
        }
    }

    public resetRoutes(newConfig: ServerConfig): void {
        this.app._router.stack = this.app._router.stack.filter((layer: any) => !layer.route);
        this.setupDefaultRoutes();
        this.setupRoutes(newConfig.routes);
        console.log('Routes have been reset with the new configuration.');
    }

    private start(): void {
        this.server = this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((err: Error) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Server stopped');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    public getApp(): express.Application {
        return this.app;
    }
}