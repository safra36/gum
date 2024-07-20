import { APIServer } from "./api/server";
import { RouteConfig, ServerConfig } from "./types/server-types";
import { AppDataSource } from "./data-source";
import dotenv from 'dotenv';
import { ProjectService } from "./services/project.service";
import { ExecutorService } from "./services/executor.service";
import { Request, Response } from 'express';

// Load environment variables
dotenv.config();

async function getDynamicRoutes(): Promise<RouteConfig[]> {
    const projectService = ProjectService.getInstance();
    const executorService = ExecutorService.getInstance();
    const projects = await projectService.getAllProjects();
    
    return projects.map(project => {
        const config = project.stagingConfig;
        return {
            method: 'get' as const,
            route: config.route,
            handler: async (req: Request, res: Response) => {
                const results = [];
                let failed = false;

                console.log(config.stages);
                
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
                            console.log("executing stage", stage.stageId, config.stages.indexOf(stage));
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
}

async function main() {
    try {
        // Initialize database connection
        await AppDataSource.initialize();
        console.log("Database connection has been established successfully.");

        // Fetch dynamic routes from the database
        const dynamicRoutes = await getDynamicRoutes();

        const config: ServerConfig = {
            port: parseInt(process.env.PORT || '3000', 10),
            routes: dynamicRoutes
        };

        // Initialize and start the API server
        const server = APIServer.getInstance();
        server.init(config);

    } catch (error) {
        console.error("Unable to start the application:", error);
        process.exit(1);
    }
}

// Run the main function
main().catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
});