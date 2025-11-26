import { AppDataSource } from "../data-source";
import { LogConfig } from "../entity/LogConfig";
import { Project } from "../entity/Project";

export interface CreateLogConfigDTO {
    name: string;
    command: string;
    description?: string;
    enabled?: boolean;
    workingDir?: string;
}

export interface UpdateLogConfigDTO {
    name?: string;
    command?: string;
    description?: string;
    enabled?: boolean;
    workingDir?: string;
}

export class LogConfigService {
    private static instance: LogConfigService;

    private constructor() {}

    public static getInstance(): LogConfigService {
        if (!LogConfigService.instance) {
            LogConfigService.instance = new LogConfigService();
        }
        return LogConfigService.instance;
    }

    /**
     * Create a new log configuration for a project
     */
    public async createLogConfig(
        projectId: number,
        dto: CreateLogConfigDTO
    ): Promise<LogConfig> {
        if (!dto.name || !dto.command) {
            throw new Error("Log name and command are required");
        }

        // Verify project exists
        const project = await AppDataSource.getRepository(Project).findOne({
            where: { id: projectId }
        });
        if (!project) {
            throw new Error("Project not found");
        }

        const logConfig = new LogConfig();
        logConfig.name = dto.name;
        logConfig.command = dto.command;
        logConfig.description = dto.description || "";
        logConfig.enabled = dto.enabled !== false;
        logConfig.workingDir = dto.workingDir || null;
        logConfig.projectId = projectId;
        logConfig.project = project;

        return await AppDataSource.manager.save(logConfig);
    }

    /**
     * Get all log configurations for a project
     */
    public async getLogConfigsByProject(projectId: number): Promise<LogConfig[]> {
        return await AppDataSource.getRepository(LogConfig).find({
            where: { projectId },
            order: { createdAt: "DESC" }
        });
    }

    /**
     * Get a specific log configuration by ID
     */
    public async getLogConfigById(logConfigId: number): Promise<LogConfig | null> {
        return await AppDataSource.getRepository(LogConfig).findOne({
            where: { id: logConfigId }
        });
    }

    /**
     * Update a log configuration
     */
    public async updateLogConfig(
        logConfigId: number,
        dto: UpdateLogConfigDTO
    ): Promise<LogConfig> {
        const logConfig = await this.getLogConfigById(logConfigId);
        if (!logConfig) {
            throw new Error("Log configuration not found");
        }

        if (dto.name !== undefined) logConfig.name = dto.name;
        if (dto.command !== undefined) logConfig.command = dto.command;
        if (dto.description !== undefined) logConfig.description = dto.description;
        if (dto.enabled !== undefined) logConfig.enabled = dto.enabled;
        if (dto.workingDir !== undefined) logConfig.workingDir = dto.workingDir;

        return await AppDataSource.manager.save(logConfig);
    }

    /**
     * Delete a log configuration
     */
    public async deleteLogConfig(logConfigId: number): Promise<void> {
        const logConfig = await this.getLogConfigById(logConfigId);
        if (!logConfig) {
            throw new Error("Log configuration not found");
        }

        await AppDataSource.manager.remove(logConfig);
    }

    /**
     * Check if a log config exists and is accessible
     */
    public async validateLogConfig(projectId: number, logConfigId: number): Promise<LogConfig> {
        const logConfig = await AppDataSource.getRepository(LogConfig).findOne({
            where: { id: logConfigId, projectId }
        });
        if (!logConfig) {
            throw new Error("Log configuration not found or does not belong to this project");
        }
        if (!logConfig.enabled) {
            throw new Error("Log configuration is disabled");
        }
        return logConfig;
    }
}
