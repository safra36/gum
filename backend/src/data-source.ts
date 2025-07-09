import "reflect-metadata"
import { DataSource } from "typeorm"
import { Project } from "./entity/Project"
import { Stage } from "./entity/Stage"
import { StagingConfig } from "./entity/StagingConfig"
import { User } from "./entity/User"
import { ExecutionHistory } from "./entity/ExecutionHistory"
import { Permission } from "./entity/Permission"
import { ProjectPermission } from "./entity/ProjectPermission"

const entities = [
    Project,
    Stage,
    StagingConfig,
    User,
    ExecutionHistory,
    Permission,
    ProjectPermission
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
