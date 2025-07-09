import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { ProjectPermission, ProjectAccessLevel } from "../entity/ProjectPermission";
import { User, UserRole } from "../entity/User";
import { Project } from "../entity/Project";

export class ProjectPermissionService {
    private static instance: ProjectPermissionService;
    private projectPermissionRepository: Repository<ProjectPermission>;
    private userRepository: Repository<User>;
    private projectRepository: Repository<Project>;

    private constructor() {
        this.projectPermissionRepository = AppDataSource.getRepository(ProjectPermission);
        this.userRepository = AppDataSource.getRepository(User);
        this.projectRepository = AppDataSource.getRepository(Project);
    }

    public static getInstance(): ProjectPermissionService {
        if (!ProjectPermissionService.instance) {
            ProjectPermissionService.instance = new ProjectPermissionService();
        }
        return ProjectPermissionService.instance;
    }

    /**
     * Check if a user has access to a project with a specific access level
     */
    public async hasProjectAccess(
        userId: number, 
        projectId: number, 
        requiredLevel: ProjectAccessLevel = ProjectAccessLevel.VIEW
    ): Promise<boolean> {
        // Admin users have access to all projects
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) return false;
        
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        // Check project-specific permissions
        const permission = await this.projectPermissionRepository.findOne({
            where: { userId, projectId }
        });

        if (!permission) return false;

        // Check if user's access level meets the requirement
        const accessLevels = [ProjectAccessLevel.VIEW, ProjectAccessLevel.EXECUTE, ProjectAccessLevel.ADMIN];
        const userLevelIndex = accessLevels.indexOf(permission.accessLevel);
        const requiredLevelIndex = accessLevels.indexOf(requiredLevel);

        return userLevelIndex >= requiredLevelIndex;
    }

    /**
     * Get all projects a user has access to
     */
    public async getUserProjects(userId: number): Promise<Project[]> {
        // Admin users can see all projects
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) return [];

        if (user.role === UserRole.ADMIN) {
            return await this.projectRepository.find({
                relations: ['stagingConfig', 'stagingConfig.stages']
            });
        }

        // Get projects user has permissions for
        const permissions = await this.projectPermissionRepository.find({
            where: { userId },
            relations: ['project', 'project.stagingConfig', 'project.stagingConfig.stages']
        });

        return permissions.map(p => p.project);
    }

    /**
     * Grant project access to a user
     */
    public async grantProjectAccess(
        userId: number,
        projectId: number,
        accessLevel: ProjectAccessLevel,
        grantedBy: number
    ): Promise<ProjectPermission> {
        // Check if permission already exists
        let permission = await this.projectPermissionRepository.findOne({
            where: { userId, projectId }
        });

        if (permission) {
            // Update existing permission
            permission.accessLevel = accessLevel;
            permission.grantedBy = grantedBy;
        } else {
            // Create new permission
            permission = new ProjectPermission();
            permission.userId = userId;
            permission.projectId = projectId;
            permission.accessLevel = accessLevel;
            permission.grantedBy = grantedBy;
        }

        return await this.projectPermissionRepository.save(permission);
    }

    /**
     * Revoke project access from a user
     */
    public async revokeProjectAccess(userId: number, projectId: number): Promise<void> {
        await this.projectPermissionRepository.delete({ userId, projectId });
    }

    /**
     * Get all users with access to a specific project
     */
    public async getProjectUsers(projectId: number): Promise<Array<{ user: User; accessLevel: ProjectAccessLevel }>> {
        const permissions = await this.projectPermissionRepository.find({
            where: { projectId },
            relations: ['user']
        });

        return permissions.map(p => ({
            user: p.user,
            accessLevel: p.accessLevel
        }));
    }

    /**
     * Get all project permissions for a user
     */
    public async getUserProjectPermissions(userId: number): Promise<ProjectPermission[]> {
        return await this.projectPermissionRepository.find({
            where: { userId },
            relations: ['project']
        });
    }

    /**
     * Get all users and their project permissions (for admin management)
     */
    public async getAllProjectPermissions(): Promise<ProjectPermission[]> {
        return await this.projectPermissionRepository.find({
            relations: ['user', 'project']
        });
    }

    /**
     * Set multiple project permissions for a user
     */
    public async setUserProjectPermissions(
        userId: number,
        projectPermissions: Array<{ projectId: number; accessLevel: ProjectAccessLevel }>,
        grantedBy: number
    ): Promise<void> {
        // Remove all existing permissions for this user
        await this.projectPermissionRepository.delete({ userId });

        // Add new permissions
        const permissions = projectPermissions.map(pp => {
            const permission = new ProjectPermission();
            permission.userId = userId;
            permission.projectId = pp.projectId;
            permission.accessLevel = pp.accessLevel;
            permission.grantedBy = grantedBy;
            return permission;
        });

        if (permissions.length > 0) {
            await this.projectPermissionRepository.save(permissions);
        }
    }
}