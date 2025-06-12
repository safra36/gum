import "reflect-metadata"
import { DataSource } from "typeorm"
import { Project } from "./entity/Project"
import { Stage } from "./entity/Stage"
import { StagingConfig } from "./entity/StagingConfig"
import { User } from "./entity/User"
import { ExecutionHistory } from "./entity/ExecutionHistory"
import { Permission } from "./entity/Permission"

const entities = [
    Project,
    Stage,
    StagingConfig,
    User,
    ExecutionHistory,
    Permission
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
