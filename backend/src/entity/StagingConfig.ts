import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Stage } from "./Stage";
import { Project } from "./Project";



@Entity()
export class StagingConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique : true
    })
    route: string;

    @Column("simple-array")
    args: string[];

    @OneToOne(() => Project, project => project.stagingConfig)
    @JoinColumn()
    project: Project;

    @OneToMany(() => Stage, stage => stage.stagingConfig, { cascade: true })
    stages: Stage[];
}