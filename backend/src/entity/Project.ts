import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { StagingConfig } from "./StagingConfig";



@Entity()
export class Project {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    working_dir: string;

    @OneToOne(() => StagingConfig, stagingConfig => stagingConfig.project, { cascade: true })
    stagingConfig: StagingConfig;
}