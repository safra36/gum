import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from "typeorm"
import { User } from "./User"
import { Project } from "./Project"

export enum ProjectAccessLevel {
    VIEW = "view",      // Can view project details
    EXECUTE = "execute", // Can execute project + view
    ADMIN = "admin"     // Full access to project + view + execute
}

@Entity()
@Unique(["userId", "projectId"]) // Ensure one permission record per user per project
export class ProjectPermission {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, user => user.projectPermissions)
    @JoinColumn({ name: "userId" })
    user: User

    @Column()
    userId: number

    @ManyToOne(() => Project, project => project.projectPermissions)
    @JoinColumn({ name: "projectId" })
    project: Project

    @Column()
    projectId: number

    @Column({
        type: "simple-enum",
        enum: ProjectAccessLevel,
        default: ProjectAccessLevel.VIEW
    })
    accessLevel: ProjectAccessLevel

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @Column({ nullable: true })
    grantedBy: number // ID of the user who granted this permission
}