import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    Unique
} from "typeorm"
import { User } from "./User"
import { Project } from "./Project"
import { LogConfig } from "./LogConfig"

export enum LogPermissionType {
    VIEW_LOGS = "view_logs",
    CONFIGURE_LOGS = "configure_logs",
    MANAGE_LOG_PERMISSIONS = "manage_log_permissions"
}

@Entity()
@Unique(["userId", "projectId", "logConfigId"])
export class LogPermission {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, user => user.logPermissions, { onDelete: "CASCADE" })
    user: User

    @Column()
    userId: number

    @ManyToOne(() => Project, { onDelete: "CASCADE" })
    project: Project

    @Column()
    projectId: number

    @ManyToOne(() => LogConfig, logConfig => logConfig.logPermissions, { onDelete: "CASCADE", nullable: true })
    logConfig: LogConfig

    @Column({ nullable: true })
    logConfigId: number

    @Column("simple-array")
    permissions: LogPermissionType[]

    @CreateDateColumn()
    createdAt: Date
}
