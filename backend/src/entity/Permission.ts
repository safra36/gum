import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { User } from "./User"
import { Project } from "./Project"
import { Stage } from "./Stage"

export enum PermissionType {
    EXECUTE = "execute",
    VIEW = "view",
    EDIT = "edit",
    VIEW_LOGS = "view_logs",
    VIEW_EXECUTION_HISTORY = "view_execution_history"
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