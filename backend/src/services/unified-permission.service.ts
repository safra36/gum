import { AppDataSource } from "../data-source";
import { Permission, PermissionType } from "../entity/Permission";
import { ProjectPermission, ProjectAccessLevel } from "../entity/ProjectPermission";
import { User, UserRole } from "../entity/User";
import { LogConfig } from "../entity/LogConfig";

/**
 * Unified permission service that consolidates all permission checking logic.
 * Handles project-level, stage-level, and log-config-level permissions.
 */
export class UnifiedPermissionService {
    private static instance: UnifiedPermissionService;

    private constructor() {}

    public static getInstance(): UnifiedPermissionService {
        if (!UnifiedPermissionService.instance) {
            UnifiedPermissionService.instance = new UnifiedPermissionService();
        }
        return UnifiedPermissionService.instance;
    }

    /**
     * Check if a user has a specific permission
     * Supports: stage-level, log-config-level, and project-level permissions
     */
    public async hasPermission(
        userId: number,
        projectId: number,
        requiredPermission: PermissionType,
        stageId?: number,
        logConfigId?: number
    ): Promise<boolean> {
        // Admins have all permissions
        const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
        if (!user) return false;
        if (user.role === UserRole.ADMIN) return true;

        // For log permissions, check log-specific permission
        if (logConfigId) {
            const logPermission = await AppDataSource.getRepository(Permission).findOne({
                where: {
                    userId,
                    projectId,
                    logConfigId,
                    type: requiredPermission,
                    granted: true
                }
            });
            if (logPermission) return true;

            // Fall back to project-level log permission (no logConfigId)
            const projectLogPermission = await AppDataSource.getRepository(Permission).findOne({
                where: {
                    userId,
                    projectId,
                    logConfigId: null,
                    type: requiredPermission,
                    granted: true
                }
            });
            return !!projectLogPermission;
        }

        // For stage permissions, check stage-specific permission
        if (stageId) {
            const stagePermission = await AppDataSource.getRepository(Permission).findOne({
                where: {
                    userId,
                    projectId,
                    stageId,
                    type: requiredPermission,
                    granted: true
                }
            });
            if (stagePermission) return true;

            // Fall back to project-level permission (no stageId)
            const projectPermission = await AppDataSource.getRepository(Permission).findOne({
                where: {
                    userId,
                    projectId,
                    stageId: null,
                    type: requiredPermission,
                    granted: true
                }
            });
            return !!projectPermission;
        }

        // Check project-level permission
        const permission = await AppDataSource.getRepository(Permission).findOne({
            where: {
                userId,
                projectId,
                stageId: null,
                logConfigId: null,
                type: requiredPermission,
                granted: true
            }
        });
        return !!permission;
    }

    /**
     * Grant a permission to a user
     */
    public async grantPermission(
        userId: number,
        projectId: number,
        permissionType: PermissionType,
        stageId?: number,
        logConfigId?: number
    ): Promise<Permission> {
        const permissionRepository = AppDataSource.getRepository(Permission);

        // Check if permission already exists
        let permission = await permissionRepository.findOne({
            where: {
                userId,
                projectId,
                stageId: stageId || null,
                logConfigId: logConfigId || null,
                type: permissionType
            }
        });

        if (permission) {
            permission.granted = true;
        } else {
            permission = permissionRepository.create({
                userId,
                projectId,
                stageId: stageId || null,
                logConfigId: logConfigId || null,
                type: permissionType,
                granted: true
            });
        }

        return await permissionRepository.save(permission);
    }

    /**
     * Revoke a permission from a user
     */
    public async revokePermission(
        userId: number,
        projectId: number,
        permissionType: PermissionType,
        stageId?: number,
        logConfigId?: number
    ): Promise<void> {
        const permissionRepository = AppDataSource.getRepository(Permission);
        await permissionRepository.update(
            {
                userId,
                projectId,
                stageId: stageId || null,
                logConfigId: logConfigId || null,
                type: permissionType
            },
            { granted: false }
        );
    }

    /**
     * Get all permissions for a user in a project
     */
    public async getUserProjectPermissions(
        userId: number,
        projectId: number
    ): Promise<Permission[]> {
        return await AppDataSource.getRepository(Permission).find({
            where: {
                userId,
                projectId,
                granted: true
            },
            relations: ['user', 'project', 'stage', 'logConfig']
        });
    }

    /**
     * Get all log-specific permissions for a user in a project
     */
    public async getUserLogPermissions(
        userId: number,
        projectId: number
    ): Promise<Permission[]> {
        return await AppDataSource.getRepository(Permission).find({
            where: [
                // Log-specific permissions
                {
                    userId,
                    projectId,
                    logConfigId: null,
                    granted: true
                },
                // Project-level log permissions
                {
                    userId,
                    projectId,
                    logConfigId: undefined,
                    stageId: null,
                    granted: true
                }
            ],
            relations: ['user', 'project', 'logConfig']
        });
    }
}
