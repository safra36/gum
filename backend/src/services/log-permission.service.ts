import { AppDataSource } from "../data-source";
import { LogPermission, LogPermissionType } from "../entity/LogPermission";
import { User } from "../entity/User";
import { Project } from "../entity/Project";
import { LogConfig } from "../entity/LogConfig";

export interface SetLogPermissionDTO {
    userId: number;
    projectId: number;
    logConfigId?: number; // null means project-level default
    permissions: LogPermissionType[];
}

export class LogPermissionService {
    private static instance: LogPermissionService;

    private constructor() {}

    public static getInstance(): LogPermissionService {
        if (!LogPermissionService.instance) {
            LogPermissionService.instance = new LogPermissionService();
        }
        return LogPermissionService.instance;
    }

    /**
     * Grant log permissions to a user
     */
    public async setLogPermission(dto: SetLogPermissionDTO): Promise<LogPermission> {
        // Verify user exists
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: dto.userId }
        });
        if (!user) {
            throw new Error("User not found");
        }

        // Verify project exists
        const project = await AppDataSource.getRepository(Project).findOne({
            where: { id: dto.projectId }
        });
        if (!project) {
            throw new Error("Project not found");
        }

        // If logConfigId is provided, verify it exists and belongs to the project
        if (dto.logConfigId) {
            const logConfig = await AppDataSource.getRepository(LogConfig).findOne({
                where: { id: dto.logConfigId, projectId: dto.projectId }
            });
            if (!logConfig) {
                throw new Error("Log configuration not found or does not belong to this project");
            }
        }

        // Check if permission already exists
        let permission = await AppDataSource.getRepository(LogPermission).findOne({
            where: {
                userId: dto.userId,
                projectId: dto.projectId,
                logConfigId: dto.logConfigId || null
            }
        });

        if (permission) {
            // Update existing permission
            permission.permissions = dto.permissions;
        } else {
            // Create new permission
            permission = new LogPermission();
            permission.userId = dto.userId;
            permission.user = user;
            permission.projectId = dto.projectId;
            permission.project = project;
            if (dto.logConfigId) {
                permission.logConfigId = dto.logConfigId;
            }
            permission.permissions = dto.permissions;
        }

        return await AppDataSource.manager.save(permission);
    }

    /**
     * Get all permissions for a user in a project
     */
    public async getUserProjectPermissions(
        userId: number,
        projectId: number
    ): Promise<LogPermission[]> {
        return await AppDataSource.getRepository(LogPermission).find({
            where: { userId, projectId }
        });
    }

    /**
     * Get permissions for a user for a specific log config
     */
    public async getUserLogPermissions(
        userId: number,
        projectId: number,
        logConfigId: number
    ): Promise<LogPermission | null> {
        return await AppDataSource.getRepository(LogPermission).findOne({
            where: { userId, projectId, logConfigId }
        });
    }

    /**
     * Get project-level default permissions for a user
     */
    public async getProjectDefaultPermissions(
        userId: number,
        projectId: number
    ): Promise<LogPermission | null> {
        return await AppDataSource.getRepository(LogPermission).findOne({
            where: { userId, projectId, logConfigId: null }
        });
    }

    /**
     * Check if user has a specific permission for a log config
     */
    public async hasLogPermission(
        userId: number,
        projectId: number,
        logConfigId: number,
        requiredPermission: LogPermissionType
    ): Promise<boolean> {
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: userId }
        });

        // Admins have all permissions
        if (user?.role === "admin") {
            return true;
        }

        // Check log-specific permission
        let permission = await this.getUserLogPermissions(userId, projectId, logConfigId);
        if (permission && permission.permissions.includes(requiredPermission)) {
            return true;
        }

        // Check project-level default permission
        const defaultPermission = await this.getProjectDefaultPermissions(userId, projectId);
        if (defaultPermission && defaultPermission.permissions.includes(requiredPermission)) {
            return true;
        }

        return false;
    }

    /**
     * Revoke all permissions for a user in a project
     */
    public async revokeProjectPermissions(userId: number, projectId: number): Promise<void> {
        await AppDataSource.getRepository(LogPermission).delete({
            userId,
            projectId
        });
    }

    /**
     * Revoke permissions for a specific log config
     */
    public async revokeLogPermission(
        userId: number,
        projectId: number,
        logConfigId: number
    ): Promise<void> {
        await AppDataSource.getRepository(LogPermission).delete({
            userId,
            projectId,
            logConfigId
        });
    }
}
