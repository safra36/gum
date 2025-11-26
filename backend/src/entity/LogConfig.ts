import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany
} from "typeorm"
import { Project } from "./Project"
import { LogPermission } from "./LogPermission"

@Entity()
export class LogConfig {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column()
    command: string

    @Column({ nullable: true })
    description: string

    @Column({ default: true })
    enabled: boolean

    @Column({ nullable: true })
    workingDir: string

    @ManyToOne(() => Project, project => project.logConfigs, { onDelete: "CASCADE" })
    project: Project

    @Column()
    projectId: number

    @OneToMany(() => LogPermission, logPermission => logPermission.logConfig)
    logPermissions: LogPermission[]

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
