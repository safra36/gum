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
import { AuthService } from "../services/auth.service";
import { ExecutionHistoryService } from "../services/execution-history.service";
import { LoginRequestDto, LoginResponseDto, User } from "../types/authentication";
import { AuthLevels } from "../authentication/auth.config";
import { ProjectPermissionService } from "../services/project-permission.service";
import { ProjectAccessLevel } from "../entity/ProjectPermission";

export class APIServer {
    
    private static instance: APIServer;
    private app: express.Application;
    private port: number;
    private server: any;
    private projectService: ProjectService;
    private executorService: ExecutorService;
    private cronJobManager: CronJobManager;
    private authService: AuthService;
    private executionHistoryService: ExecutionHistoryService;
    private projectPermissionService: ProjectPermissionService;

    private constructor() {
        this.app = express();
        this.projectService = ProjectService.getInstance();
        this.cronJobManager = CronJobManager.getInstance();
        this.executorService = ExecutorService.getInstance();
        this.authService = AuthService.getInstance();
        this.executionHistoryService = ExecutionHistoryService.getInstance();
        this.projectPermissionService = ProjectPermissionService.getInstance();
        this.setupMiddleware();

        console.log(this.authService);
        
    }

    public static getInstance(): APIServer {
        if (!APIServer.instance) {
            APIServer.instance = new APIServer();
        }
        return APIServer.instance;
    }

    private getCorsOrigins(): string[] {
        const defaultOrigins = [
            "http://localhost:5173",
            "http://localhost:4173", 
            "http://localhost:3000",
            "http://localhost:8080",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:4173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8080"
        ];

        const envOrigins = process.env.CORS_ORIGINS;
        if (envOrigins) {
            const customOrigins = envOrigins.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
            console.log('Using custom CORS origins from environment:', customOrigins);
            return customOrigins;
        }

        console.log('Using default CORS origins');
        return defaultOrigins;
    }

    private setupMiddleware(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cors({
            origin: this.getCorsOrigins(),
            credentials: true,
            methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
            preflightContinue: false,
            optionsSuccessStatus: 204
        }))
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


        this.app.post("/login", async (req : Request, res : Response) => {
            const {
                password,
                username
            } = req.body as LoginRequestDto

            const token = await this.authService.login(username, password);

            if(token) {
                res.status(200).json({
                    access_token : token
                } as LoginResponseDto)
            } else {
                res.status(401).json({ error: "Invalid credentials" });
            }
        })


        this.app.get("/verify", async (req : Request, res : Response) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    return res.status(401).json({ error: "No authorization header" });
                }

                const user_token = authHeader.split(" ")[1];
                const user = await this.authService.verifyLogin(user_token);
                if(user) {
                    res.status(200).json({ user: { id: user.id, username: user.username, role: user.role } });
                } else {
                    res.status(401).json({ error: "Invalid token" });
                }
            } catch (error) {
                res.status(401).json({ error: "Invalid token" });
            }
        })

        // User profile endpoint with permissions
        this.app.get("/me", this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const user = req["user"] as any;
                const fullUser = await this.authService.getUserById(user.id);
                
                if (!fullUser) {
                    return res.status(404).json({ error: "User not found" });
                }

                res.status(200).json({
                    id: fullUser.id,
                    username: fullUser.username,
                    email: fullUser.email,
                    role: fullUser.role,
                    permissions: fullUser.permissions,
                    isActive: fullUser.isActive
                });
            } catch (error) {
                console.error("Error fetching user profile:", error);
                res.status(500).json({ error: "Failed to fetch user profile" });
            }
        });

        // Password change endpoint
        this.app.post("/change-password", this.authenticateRequest, async (req: Request, res: Response) => {
            try {
                const { currentPassword, newPassword } = req.body;
                const user = req["user"] as any;

                if (!currentPassword || !newPassword) {
                    return res.status(400).json({ error: "Current password and new password are required" });
                }

                if (newPassword.length < 6) {
                    return res.status(400).json({ error: "New password must be at least 6 characters long" });
                }

                const success = await this.authService.changePassword(user.id, currentPassword, newPassword);
                
                if (success) {
                    res.status(200).json({ message: "Password changed successfully" });
                } else {
                    res.status(400).json({ error: "Current password is incorrect" });
                }
            } catch (error) {
                console.error("Password change error:", error);
                res.status(500).json({ error: "Failed to change password" });
            }
        })

        // SSE endpoint for real-time execution logs
        this.app.get("/execution-stream/:executionId", async (req: Request, res: Response) => {
            const executionId = req.params.executionId;
            
            // Handle authentication via query parameter since EventSource doesn't support headers
            const token = req.query.token as string;
            console.log("SSE Auth - Token received:", token ? `${token.substring(0, 20)}...` : "none");
            
            if (!token) {
                console.log("SSE Auth - No token provided");
                return res.status(401).json({ error: "No authentication token provided" });
            }
            
            try {
                const user = await this.authService.verifyLogin(token);
                console.log("SSE Auth - User verification result:", user ? `User ${user.username} (ID: ${user.id})` : "null");
                
                if (!user) {
                    console.log("SSE Auth - User verification failed");
                    return res.status(401).json({ error: "Invalid authentication token" });
                }
                
                console.log("SSE Auth - Authentication successful for user:", user.username);
            } catch (error) {
                console.error("SSE Auth - Error during verification:", error);
                return res.status(401).json({ error: "Authentication error" });
            }

            // Set SSE headers
            console.log("SSE - Setting up event stream for execution:", executionId);
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });

            // Send initial connection event
            console.log("SSE - Sending initial connection event");
            res.write(`data: ${JSON.stringify({ type: 'connected', executionId })}\n\n`);

            const executorService = ExecutorService.getInstance();
            const emitter = executorService.getExecutionEmitter();

            // Set up event listeners for this execution
            const stdoutListener = (data: string) => {
                res.write(`data: ${JSON.stringify({ type: 'stdout', data, timestamp: Date.now() })}\n\n`);
            };

            const stderrListener = (data: string) => {
                res.write(`data: ${JSON.stringify({ type: 'stderr', data, timestamp: Date.now() })}\n\n`);
            };

            const closeListener = (result: any) => {
                console.log(`SSE - Close event received for execution ${executionId}:`, result);
                res.write(`data: ${JSON.stringify({ type: 'close', result, timestamp: Date.now() })}\n\n`);
                cleanup();
            };

            const errorListener = (error: string) => {
                console.log(`SSE - Error event received for execution ${executionId}:`, error);
                res.write(`data: ${JSON.stringify({ type: 'error', error, timestamp: Date.now() })}\n\n`);
                cleanup();
            };

            // Register event listeners
            emitter.on(`execution:${executionId}:stdout`, stdoutListener);
            emitter.on(`execution:${executionId}:stderr`, stderrListener);
            emitter.on(`execution:${executionId}:close`, closeListener);
            emitter.on(`execution:${executionId}:error`, errorListener);

            // Cleanup function
            const cleanup = () => {
                emitter.removeListener(`execution:${executionId}:stdout`, stdoutListener);
                emitter.removeListener(`execution:${executionId}:stderr`, stderrListener);
                emitter.removeListener(`execution:${executionId}:close`, closeListener);
                emitter.removeListener(`execution:${executionId}:error`, errorListener);
                res.end();
            };

            // Handle client disconnect
            req.on('close', cleanup);
            req.on('aborted', cleanup);

            // Send keepalive ping every 30 seconds
            const keepAlive = setInterval(() => {
                res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
            }, 30000);

            req.on('close', () => {
                clearInterval(keepAlive);
                cleanup();
            });
        });

        // Normal execution endpoint by project ID
        this.app.post("/execute-project", this.authenticateRequest, this.checkAccess(AuthLevels.ExecuteScript), this.checkProjectAccess(ProjectAccessLevel.EXECUTE), async (req: Request, res: Response) => {
            try {
                const { projectId } = req.body;
                const user = req["user"] as any;

                if (!projectId) {
                    return res.status(400).json({ error: "Project ID is required" });
                }

                // Get the project and its staging configuration
                const project = await this.projectService.getProjectById(projectId);
                if (!project || !project.stagingConfig) {
                    return res.status(404).json({ error: "Project or staging configuration not found" });
                }

                if(StateManager.isExecuting) {
                    return res.status(400).json({
                        message: `Another script is being executed, please retry again later`,
                        project: project.title,
                        success: false,
                        results: []
                    });
                }

                StateManager.isExecuting = true;

                const results = [];
                let failed = false;
                const config = project.stagingConfig;

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
                            const executionContext = {
                                userId: user.id,
                                projectId: project.id,
                                stageId: stage.id,
                                workingDirectory: project.working_dir
                            };
                            const result = await this.executorService.executeScriptWithHistory(stage.script, config.args, executionContext);
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

                StateManager.isExecuting = false;
                const status = failed ? 500 : 200;
                res.status(status).json({
                    message: `Executed project: ${project.title}`,
                    project: project.title,
                    success: !failed,
                    results: results
                });

            } catch (error) {
                StateManager.isExecuting = false;
                console.error("Execution error:", error);
                res.status(500).json({ error: "Failed to execute project", details: error.message });
            }
        });

        // Streaming execution endpoint
        this.app.post("/execute-stream", this.authenticateRequest, this.checkAccess(AuthLevels.ExecuteScript), this.checkProjectAccess(ProjectAccessLevel.EXECUTE), async (req: Request, res: Response) => {
            try {
                const { projectId, stageId } = req.body;
                const user = req["user"] as any;
                const executionId = `exec_${Date.now()}_${user.id}`;

                if (!projectId) {
                    return res.status(400).json({ error: "Project ID is required" });
                }

                // Get the project and its staging configuration
                const project = await this.projectService.getProjectById(projectId);
                if (!project || !project.stagingConfig) {
                    return res.status(404).json({ error: "Project or staging configuration not found" });
                }

                // Return execution ID immediately for client to connect to SSE
                res.status(200).json({ 
                    executionId,
                    message: "Execution started. Connect to /execution-stream/:executionId for real-time logs."
                });

                // Start execution asynchronously using project's staging configuration
                setTimeout(async () => {
                    try {
                        const executorService = ExecutorService.getInstance();
                        const stagingConfig = project.stagingConfig;
                        
                        // Generate the full script from the project's stages
                        const scriptParts = [`#!/bin/bash`, `# Combined script for project: ${project.title}`, ``];
                        
                        stagingConfig.stages.forEach((stage, index) => {
                            scriptParts.push(`echo "=== Executing Stage ${index + 1}: ${stage.stageId} ==="`);
                            scriptParts.push(stage.script);
                            scriptParts.push(`if [ $? -ne 0 ]; then`);
                            scriptParts.push(`  echo "Stage ${stage.stageId} failed with exit code $?"`);
                            scriptParts.push(`  exit 1`);
                            scriptParts.push(`fi`);
                            scriptParts.push(`echo "Stage ${stage.stageId} completed successfully"`);
                            scriptParts.push(``);
                        });
                        
                        scriptParts.push(`echo "All stages completed successfully"`);
                        const fullScript = scriptParts.join('\n');
                        
                        const executionContext = {
                            userId: user.id,
                            projectId: project.id,
                            workingDirectory: project.working_dir
                        };
                        
                        await executorService.executeScriptWithStreamingAndHistory(fullScript, stagingConfig.args, executionId, executionContext);
                    } catch (error) {
                        console.error("Execution error:", error);
                    }
                }, 100);

            } catch (error) {
                console.error("Stream execution error:", error);
                res.status(500).json({ error: "Failed to start execution stream" });
            }
        });

        // User Management Routes (Admin only)
        this.app.get('/users', this.authenticateRequest, this.checkAccess(AuthLevels.ViewUsers), async (req: Request, res: Response) => {
            try {
                const users = await this.authService.getAllUsers();
                res.status(200).json(users);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch users', details: error.message });
            }
        });

        this.app.post('/users', this.authenticateRequest, this.checkAccess(AuthLevels.CreateUser), async (req: Request, res: Response) => {
            try {
                const { username, password, email, role, permissions } = req.body;
                
                if (!username || !password) {
                    return res.status(400).json({ error: 'Username and password are required' });
                }

                const user = await this.authService.createUser({
                    username,
                    password,
                    email,
                    role,
                    permissions
                });

                res.status(201).json({ message: 'User created successfully', user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions,
                    isActive: user.isActive
                }});
            } catch (error) {
                res.status(500).json({ error: 'Failed to create user', details: error.message });
            }
        });

        this.app.put('/users/:userId', this.authenticateRequest, this.checkAccess(AuthLevels.EditUser), async (req: Request, res: Response) => {
            try {
                const userId = parseInt(req.params.userId);
                const { username, password, email, role, permissions, isActive } = req.body;

                const user = await this.authService.updateUser(userId, {
                    username,
                    password,
                    email,
                    role,
                    permissions,
                    isActive
                });

                res.status(200).json({ message: 'User updated successfully', user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions,
                    isActive: user.isActive
                }});
            } catch (error) {
                res.status(500).json({ error: 'Failed to update user', details: error.message });
            }
        });

        this.app.delete('/users/:userId', this.authenticateRequest, this.checkAccess(AuthLevels.DeleteUser), async (req: Request, res: Response) => {
            try {
                const userId = parseInt(req.params.userId);
                await this.authService.deleteUser(userId);
                res.status(200).json({ message: 'User deleted successfully' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to delete user', details: error.message });
            }
        });

        // Project Permission Management Routes
        this.app.get('/project-permissions', this.authenticateRequest, this.checkAccess(AuthLevels.ManageUsers), async (req: Request, res: Response) => {
            try {
                const permissions = await this.projectPermissionService.getAllProjectPermissions();
                res.status(200).json(permissions);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch project permissions', details: error.message });
            }
        });

        this.app.post('/project-permissions', this.authenticateRequest, this.checkAccess(AuthLevels.ManageUsers), async (req: Request, res: Response) => {
            try {
                const { userId, projectId, accessLevel } = req.body;
                const grantedBy = req["user"].id;

                if (!userId || !projectId || !accessLevel) {
                    return res.status(400).json({ error: 'userId, projectId, and accessLevel are required' });
                }

                const permission = await this.projectPermissionService.grantProjectAccess(
                    parseInt(userId),
                    parseInt(projectId),
                    accessLevel,
                    grantedBy
                );

                res.status(201).json({ message: 'Project permission granted successfully', permission });
            } catch (error) {
                res.status(500).json({ error: 'Failed to grant project permission', details: error.message });
            }
        });

        this.app.delete('/project-permissions/:userId/:projectId', this.authenticateRequest, this.checkAccess(AuthLevels.ManageUsers), async (req: Request, res: Response) => {
            try {
                const userId = parseInt(req.params.userId);
                const projectId = parseInt(req.params.projectId);

                await this.projectPermissionService.revokeProjectAccess(userId, projectId);
                res.status(200).json({ message: 'Project permission revoked successfully' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to revoke project permission', details: error.message });
            }
        });

        this.app.put('/users/:userId/project-permissions', this.authenticateRequest, this.checkAccess(AuthLevels.ManageUsers), async (req: Request, res: Response) => {
            try {
                const userId = parseInt(req.params.userId);
                const { projectPermissions } = req.body;
                const grantedBy = req["user"].id;

                if (!Array.isArray(projectPermissions)) {
                    return res.status(400).json({ error: 'projectPermissions must be an array' });
                }

                await this.projectPermissionService.setUserProjectPermissions(
                    userId,
                    projectPermissions,
                    grantedBy
                );

                res.status(200).json({ message: 'Project permissions updated successfully' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to update project permissions', details: error.message });
            }
        });

        this.app.get('/users/:userId/project-permissions', this.authenticateRequest, this.checkAccess(AuthLevels.ManageUsers), async (req: Request, res: Response) => {
            try {
                const userId = parseInt(req.params.userId);
                const permissions = await this.projectPermissionService.getUserProjectPermissions(userId);
                res.status(200).json(permissions);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user project permissions', details: error.message });
            }
        });

        // Execution History Routes
        this.app.get('/execution-history', this.authenticateRequest, this.checkAccess(AuthLevels.ViewExecutionHistory), async (req: Request, res: Response) => {
            try {
                const { projectId, stageId, status, limit = 50, offset = 0 } = req.query;
                const currentUser = req["user"] as any;
                
                const options: any = {
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string)
                };

                // Non-admin users can only see their own execution history
                if (currentUser.role !== 'admin') {
                    options.userId = currentUser.id;
                }

                if (projectId) options.projectId = parseInt(projectId as string);
                if (stageId) options.stageId = parseInt(stageId as string);
                if (status) options.status = status;

                const result = await this.executionHistoryService.getExecutionHistory(options);
                res.status(200).json(result);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch execution history', details: error.message });
            }
        });

        this.app.get('/execution-history/:executionId', this.authenticateRequest, this.checkAccess(AuthLevels.ViewExecutionHistory), async (req: Request, res: Response) => {
            try {
                const executionId = parseInt(req.params.executionId);
                const execution = await this.executionHistoryService.getExecutionById(executionId);
                
                if (!execution) {
                    return res.status(404).json({ error: 'Execution not found' });
                }

                const currentUser = req["user"] as any;
                // Non-admin users can only see their own executions
                if (currentUser.role !== 'admin' && execution.userId !== currentUser.id) {
                    return res.status(403).json({ error: 'Access denied' });
                }

                res.status(200).json(execution);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch execution', details: error.message });
            }
        });

        // Project creation route
        this.app.post('/project', this.authenticateRequest, this.checkAccess(AuthLevels.CreateProject), async (req: Request, res: Response) => {


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


        this.app.get('/project/:id/branches', this.authenticateRequest, this.checkAccess(AuthLevels.SwitchBranch), this.checkProjectAccess(ProjectAccessLevel.VIEW), async (req: Request, res: Response) => {


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

        this.app.post('/project/:id/switch-branch', this.authenticateRequest, this.checkAccess(AuthLevels.SwitchBranch), async (req: Request, res: Response) => {



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
                const user = req["user"] as any;
                
                // Get only projects the user has access to
                const projects = await this.projectService.getProjectsForUser(user.id);
                const projectDTOs = projects.map(this.projectToDTO);

                const allowed = await this.authService.hasPermission(
                    user.id,
                    AuthLevels.EditProject
                )
    
                let response = (allowed) ? projectDTOs :
                projectDTOs.map(projectObject => {

                    projectObject.stagingConfig.stages = projectObject.stagingConfig.stages.map(stage => ({
                        id : stage.id,
                        script : "Hidden",
                        stageId : stage.stageId
                    }));

                    projectObject.stagingConfig.args = projectObject.stagingConfig.args.map(arg => "Hidden")
                    projectObject.stagingConfig.route = "Hidden"
                    projectObject.working_dir = "Hidden"
                    projectObject.cronJob = "Hidden"

                    return projectObject;
                })
                
            
                res.status(200).json(response);

            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch stages', details: error.message });
            }
        });


        this.app.put('/project/:projectId', this.authenticateRequest, this.checkAccess(AuthLevels.EditProject), async (req: Request, res: Response) => {
            try {
                const projectId = parseInt(req.params.projectId);
                const updateData: UpdateProjectDTO = {
                    title: req.body.title,
                    working_dir: req.body.working_dir,
                    stagingConfig: {
                        route: req.body.stagingConfig.route,
                        args: req.body.stagingConfig.args,
                        stages: req.body.stagingConfig.stages
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
        this.app.put('/stage/:stageId', this.authenticateRequest, this.checkAccess(AuthLevels.EditProject), async (req: Request, res: Response) => {
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

        this.app.get('/project/:id/gitlog', this.authenticateRequest, this.checkAccess(AuthLevels.GetGitLog), this.checkProjectAccess(ProjectAccessLevel.VIEW), async (req: Request, res: Response) => {
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

        this.app.post('/project/:id/revert-commit', this.authenticateRequest, this.checkAccess(AuthLevels.RevertCommit), async (req: Request, res: Response) => {
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

        this.app.post('/project/:id/switch-to-head', this.authenticateRequest, this.checkAccess(AuthLevels.RevertCommit), async (req: Request, res: Response) => {
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



        this.app.post('/project/:id/cron', this.authenticateRequest, this.checkAccess(AuthLevels.SetCron), async (req: Request, res: Response) => {
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
        this.app.get('/project/:id/cron', this.authenticateRequest, this.checkAccess(AuthLevels.SetCron), async (req: Request, res: Response) => {
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



        this.app.delete('/project/:id/cron', this.authenticateRequest, this.checkAccess(AuthLevels.SetCron), async (req: Request, res: Response) => {
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
        
        // Check if stagingConfig exists before accessing its properties
        if (!project.stagingConfig) {
            throw new Error('Project staging configuration is missing');
        }
        
        return {
            id: project.id,
            title: project.title,
            working_dir: project.working_dir,
            stagingConfig: {
                id: project.stagingConfig.id,
                route: project.stagingConfig.route,
                args: project.stagingConfig.args || [],
                stages: (project.stagingConfig.stages || []).map(stage => ({
                    id: stage.id,
                    script: stage.script,
                    stageId: stage.stageId
                }))
            },
            cronJob: project.cronJob // Add this line to include the cronJob in the DTO
        };
    }

    private async authenticateRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        // Authentication logic (currently commented out)

        const user_token = req.headers?.authorization?.split(" ")[1] || "";
        const user = await AuthService.getInstance().verifyLogin(user_token);
        if(user) {
            req["user"] = user;
            next();
        }
        else res.status(401).json({ error: 'Request failed', details: "login failed" });

        
    }


    private checkAccess(access : AuthLevels) {

        return async (req : Request , res : Response, next : NextFunction) => {

            const user = req["user"] as any;
            const allowed = await this.authService.hasPermission(
                user.id,
                access
            )

            if(!allowed) {
                res.status(403).json({ error: 'Request failed', details: "permission denied" });
                return;
            }
            next()

        }

    }

    private checkProjectAccess(accessLevel: ProjectAccessLevel) {

        return async (req : Request , res : Response, next : NextFunction) => {

            const user = req["user"] as any;
            const projectId = parseInt(req.params.projectId || req.params.id || req.body.projectId);

            if (!projectId) {
                res.status(400).json({ error: 'Project ID is required' });
                return;
            }

            const hasAccess = await this.projectPermissionService.hasProjectAccess(
                user.id,
                projectId,
                accessLevel
            );

            if(!hasAccess) {
                res.status(403).json({ error: 'Access denied', details: "insufficient project permissions" });
                return;
            }
            next()

        }

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