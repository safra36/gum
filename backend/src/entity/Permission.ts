import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { User } from "./User"
import { Project } from "./Project"
import { Stage } from "./Stage"
import { LogConfig } from "./LogConfig"

export enum PermissionType {
    // Project-level permissions
    EXECUTE = "execute",
    VIEW = "view",
    EDIT = "edit",
    VIEW_EXECUTION_HISTORY = "view_execution_history",
    // Log permissions (can be project-level or log-config-level)
    VIEW_LOGS = "view_logs",
    CONFIGURE_LOGS = "configure_logs",
    DELETE_LOGS = "delete_logs",
    MANAGE_LOG_PERMISSIONS = "manage_log_permissions"
}

@Entity()
export class Permission {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user: User

    @Column()
    userId: number

    @ManyToOne(() => Project, { nullable: true })
    @JoinColumn({ name: "projectId" })
    project: Project

    @Column({ nullable: true })
    projectId: number

    @ManyToOne(() => Stage, { nullable: true })
    @JoinColumn({ name: "stageId" })
    stage: Stage

    @Column({ nullable: true })
    stageId: number

    @ManyToOne(() => LogConfig, { nullable: true })
    @JoinColumn({ name: "logConfigId" })
    logConfig: LogConfig

    @Column({ nullable: true })
    logConfigId: number

    @Column({
        type: "simple-enum",
        enum: PermissionType
    })
    type: PermissionType

    @Column({ default: true })
    granted: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}