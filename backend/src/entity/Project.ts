import { Column, Entity, OneToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { StagingConfig } from "./StagingConfig";
import { ProjectPermission } from "./ProjectPermission";

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

    @Column({ nullable: true })
    cronJob: string;

    @OneToMany(() => ProjectPermission, projectPermission => projectPermission.project)
    projectPermissions: ProjectPermission[];
    
}