import "reflect-metadata"
import { DataSource } from "typeorm"
import { Project } from "./entity/Project"
import { Stage } from "./entity/Stage"
import { StagingConfig } from "./entity/StagingConfig"



const entities = [
    Project,
    Stage,
    StagingConfig
]

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [
        ...entities
    ],
    migrations: [],
    subscribers: [],
})
