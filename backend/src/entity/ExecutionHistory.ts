import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { User } from "./User"
import { Project } from "./Project"
import { Stage } from "./Stage"

export enum ExecutionStatus {
    SUCCESS = "success",
    FAILED = "failed",
    RUNNING = "running",
    CANCELLED = "cancelled"
}

@Entity()
export class ExecutionHistory {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, user => user.executionHistory)
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

    @Column()
    command: string

    @Column({ nullable: true })
    workingDirectory: string

    @Column({
        type: "simple-enum",
        enum: ExecutionStatus,
        default: ExecutionStatus.RUNNING
    })
    status: ExecutionStatus

    @Column("text", { nullable: true })
    output: string

    @Column("text", { nullable: true })
    errorOutput: string

    @Column({ nullable: true })
    exitCode: number

    @Column({ nullable: true })
    duration: number // in milliseconds

    @CreateDateColumn()
    executedAt: Date

    @Column({ nullable: true })
    finishedAt: Date
}