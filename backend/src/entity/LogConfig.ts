import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm"
import { Project } from "./Project"

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

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
