import { AppDataSource } from "../data-source";
import { Permission, PermissionType } from "../entity/Permission";
import { User, UserRole } from "../entity/User";
import { Project } from "../entity/Project";
import { LogConfig } from "../entity/LogConfig";

export enum LogPermissionTypeEnum {
    VIEW_LOGS = "view_logs",
    CONFIGURE_LOGS = "configure_logs",
    DELETE_LOGS = "delete_logs",
    MANAGE_LOG_PERMISSIONS = "manage_log_permissions"
}

export interface SetLogPermissionDTO {
    userId: number;
    projectId: number;
    logConfigId?: number; // null means project-level default
    permissions: LogPermissionTypeEnum[];
}

/**
 * Log Permission Service - manages log-specific permissions using the unified Permission table
 */
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
     * Grant/set log permissions to a user (stores in unified Permission table)
     */
    public async setLogPermission(dto: SetLogPermissionDTO): Promise<{ permissions: any[] }> {
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

        const permissionRepository = AppDataSource.getRepository(Permission);

        // Create/update individual Permission records for each permission type
        const savedPermissions = [];
        for (const permType of dto.permissions) {
            let permission = await permissionRepository.findOne({
                where: {
                    userId: dto.userId,
                    projectId: dto.projectId,
                    logConfigId: dto.logConfigId || null,
                    type: permType as any
                }
            });

            if (!permission) {
                permission = permissionRepository.create({
                    userId: dto.userId,
                    projectId: dto.projectId,
                    logConfigId: dto.logConfigId || null,
                    type: permType as any,
                    granted: true
                });
            } else {
                permission.granted = true;
            }

            const saved = await permissionRepository.save(permission);
            savedPermissions.push(saved);
        }

        return { permissions: savedPermissions };
    }

    /**
     * Check if user has a specific log permission
     */
    public async hasLogPermission(
        userId: number,
        projectId: number,
        logConfigId: number | null,
        requiredPermission: LogPermissionTypeEnum
    ): Promise<boolean> {
        // Admin bypass
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: userId }
        });
        if (!user) return false;
        if (user.role === UserRole.ADMIN) return true;

        // Check log-specific permission
        let permission = await AppDataSource.getRepository(Permission).findOne({
            where: {
                userId,
                projectId,
                logConfigId: logConfigId || null,
                type: requiredPermission as any,
                granted: true
            }
        });

        if (permission) return true;

        // Fall back to project-level permission (logConfigId = null)
        permission = await AppDataSource.getRepository(Permission).findOne({
            where: {
                userId,
                projectId,
                logConfigId: null,
                type: requiredPermission as any,
                granted: true
            }
        });

        return !!permission;
    }

    /**
     * Get user's log permissions for a project (combines all individual Permission records)
     */
    public async getUserLogPermissions(
        userId: number,
        projectId: number,
        logConfigId?: number
    ): Promise<LogPermissionTypeEnum[]> {
        const permissions = await AppDataSource.getRepository(Permission).find({
            where: {
                userId,
                projectId,
                logConfigId: logConfigId || null,
                granted: true
            }
        });

        return permissions
            .map(p => p.type)
            .filter(type => [
                "view_logs",
                "configure_logs",
                "delete_logs",
                "manage_log_permissions"
            ].includes(type)) as unknown as LogPermissionTypeEnum[];
    }

    /**
     * Get project-level default permissions for a user
     */
    public async getProjectDefaultPermissions(
        userId: number,
        projectId: number
    ): Promise<LogPermissionTypeEnum[]> {
        const permissions = await AppDataSource.getRepository(Permission).find({
            where: {
                userId,
                projectId,
                logConfigId: null,
                granted: true
            }
        });

        return permissions
            .map(p => p.type)
            .filter(type => [
                "view_logs",
                "configure_logs",
                "delete_logs",
                "manage_log_permissions"
            ].includes(type)) as unknown as LogPermissionTypeEnum[];
    }

    /**
     * Get all permissions for a project (for UI management)
     */
    public async getProjectPermissions(projectId: number): Promise<any[]> {
        const permissions = await AppDataSource.getRepository(Permission).find({
            where: {
                projectId,
                granted: true
            },
            relations: ['user', 'logConfig']
        });

        // Filter to only log-related permissions
        const logPermissions = permissions.filter(p =>
            [
                "view_logs",
                "configure_logs",
                "delete_logs",
                "manage_log_permissions"
            ].includes(p.type)
        );

        // Group by user/logConfig for display
        const grouped: any = {};
        logPermissions.forEach(p => {
            const key = `${p.userId}_${p.logConfigId || 'default'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    userId: p.userId,
                    username: p.user?.username,
                    logConfigId: p.logConfigId,
                    logConfigName: p.logConfig?.name || "Project Default",
                    permissions: []
                };
            }
            grouped[key].permissions.push(p.type);
        });

        return Object.values(grouped);
    }
}
