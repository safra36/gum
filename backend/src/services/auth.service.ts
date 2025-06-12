import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../entity/User";
import { Permission, PermissionType } from "../entity/Permission";
import { AuthLevels } from "../authentication/auth.config";

interface JwtPayload {
    userId: number;
    username: string;
    role: UserRole;
}

export class AuthService {
    private static instance: AuthService;
    private secretKey: string;
    private userRepository: Repository<User>;
    private permissionRepository: Repository<Permission>;

    private constructor() {
        this.secretKey = process.env.JWT_SECRET_KEY || "your-secret-key";
        this.userRepository = AppDataSource.getRepository(User);
        this.permissionRepository = AppDataSource.getRepository(Permission);
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public async createUser(userData: {
        username: string;
        password: string;
        email?: string;
        role?: UserRole;
        permissions?: string[];
    }): Promise<User> {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const user = new User();
        user.username = userData.username;
        user.password = hashedPassword;
        user.email = userData.email || null;
        user.role = userData.role || UserRole.USER;
        user.permissions = userData.permissions || [];
        
        return await this.userRepository.save(user);
    }

    public async updateUser(userId: number, userData: {
        username?: string;
        password?: string;
        email?: string;
        role?: UserRole;
        permissions?: string[];
        isActive?: boolean;
    }): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error("User not found");
        }

        if (userData.username) user.username = userData.username;
        if (userData.password) user.password = await bcrypt.hash(userData.password, 10);
        if (userData.email !== undefined) user.email = userData.email;
        if (userData.role) user.role = userData.role;
        if (userData.permissions) user.permissions = userData.permissions;
        if (userData.isActive !== undefined) user.isActive = userData.isActive;

        return await this.userRepository.save(user);
    }

    public async deleteUser(userId: number): Promise<void> {
        await this.userRepository.delete(userId);
    }

    public async getAllUsers(): Promise<User[]> {
        return await this.userRepository.find({
            select: ["id", "username", "email", "role", "isActive", "permissions", "createdAt", "updatedAt"]
        });
    }

    public async getUserById(userId: number): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { id: userId },
            select: ["id", "username", "email", "role", "isActive", "permissions", "createdAt", "updatedAt"]
        });
    }

    public createJwtToken(user: User): string {
        const payload: JwtPayload = {
            userId: user.id,
            username: user.username,
            role: user.role,
        };
        return jwt.sign(payload, this.secretKey, { expiresIn: "24h" });
    }

    public verifyJwtToken(token: string): JwtPayload | null {
        if (!token) return null;
        try {
            const decoded = jwt.verify(token, this.secretKey) as JwtPayload;
            return decoded;
        } catch (error) {
            console.error("JWT verification failed:", error);
            return null;
        }
    }

    public async login(username: string, password: string): Promise<string | null> {
        try {
            const user = await this.userRepository.findOne({ 
                where: { username, isActive: true } 
            });
            
            if (!user) {
                return null;
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return null;
            }

            return this.createJwtToken(user);
        } catch (error) {
            console.error("Login failed:", error);
            return null;
        }
    }

    public async verifyLogin(token: string): Promise<User | null> {
        const payload = this.verifyJwtToken(token);
        if (!payload) {
            return null;
        }

        try {
            const user = await this.userRepository.findOne({
                where: { id: payload.userId, isActive: true },
                select: ["id", "username", "email", "role", "isActive", "permissions", "createdAt", "updatedAt"]
            });

            return user;
        } catch (error) {
            console.error("Verify login failed:", error);
            return null;
        }
    }

    public async hasPermission(userId: number, permission: AuthLevels): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user || !user.isActive) {
                return false;
            }

            // Admin role has all permissions
            if (user.role === UserRole.ADMIN) {
                return true;
            }

            // Check if user has the permission in their permissions array
            return user.permissions.includes(permission);
        } catch (error) {
            console.error("Permission check failed:", error);
            return false;
        }
    }

    public async hasProjectPermission(
        userId: number, 
        projectId: number, 
        permissionType: PermissionType
    ): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user || !user.isActive) {
                return false;
            }

            // Admin role has all permissions
            if (user.role === UserRole.ADMIN) {
                return true;
            }

            // Check specific project permission
            const permission = await this.permissionRepository.findOne({
                where: {
                    userId,
                    projectId,
                    type: permissionType,
                    granted: true
                }
            });

            return !!permission;
        } catch (error) {
            console.error("Project permission check failed:", error);
            return false;
        }
    }

    public async hasStagePermission(
        userId: number, 
        stageId: number, 
        permissionType: PermissionType
    ): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user || !user.isActive) {
                return false;
            }

            // Admin role has all permissions
            if (user.role === UserRole.ADMIN) {
                return true;
            }

            // Check specific stage permission
            const permission = await this.permissionRepository.findOne({
                where: {
                    userId,
                    stageId,
                    type: permissionType,
                    granted: true
                }
            });

            return !!permission;
        } catch (error) {
            console.error("Stage permission check failed:", error);
            return false;
        }
    }

    public async grantPermission(
        userId: number,
        permissionType: PermissionType,
        projectId?: number,
        stageId?: number
    ): Promise<Permission> {
        const permission = new Permission();
        permission.userId = userId;
        permission.type = permissionType;
        permission.projectId = projectId || null;
        permission.stageId = stageId || null;
        permission.granted = true;

        return await this.permissionRepository.save(permission);
    }

    public async revokePermission(
        userId: number,
        permissionType: PermissionType,
        projectId?: number,
        stageId?: number
    ): Promise<void> {
        await this.permissionRepository.delete({
            userId,
            type: permissionType,
            projectId: projectId || null,
            stageId: stageId || null
        });
    }

    public async getUserPermissions(userId: number): Promise<Permission[]> {
        return await this.permissionRepository.find({
            where: { userId },
            relations: ["project", "stage"]
        });
    }

    public async changePassword(
        userId: number,
        currentPassword: string,
        newPassword: string
    ): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) {
                return false;
            }

            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return false;
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await this.userRepository.save(user);
            
            return true;
        } catch (error) {
            console.error("Password change failed:", error);
            return false;
        }
    }

    public async initializeDefaultAdmin(): Promise<void> {
        const existingAdmin = await this.userRepository.findOne({
            where: { role: UserRole.ADMIN }
        });

        if (!existingAdmin) {
            await this.createUser({
                username: "admin",
                password: "admin123",
                email: "admin@gum.local",
                role: UserRole.ADMIN,
                permissions: Object.values(AuthLevels)
            });
            console.log("Default admin user created: admin/admin123");
        }
    }
}