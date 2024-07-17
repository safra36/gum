import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { StagingConfig } from "./StagingConfig";



@Entity()
export class Stage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    script: string;

    @Column()
    stageId: string;

    @ManyToOne(() => StagingConfig, stagingConfig => stagingConfig.stages)
    stagingConfig: StagingConfig;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    created_at: Date;
}