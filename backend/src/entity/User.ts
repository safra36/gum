import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { ExecutionHistory } from "./ExecutionHistory"

export enum UserRole {
    ADMIN = "admin",
    USER = "user",
    VIEWER = "viewer"
}

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    username: string

    @Column()
    password: string

    @Column({ nullable: true })
    email: string

    @Column({
        type: "simple-enum",
        enum: UserRole,
        default: UserRole.USER
    })
    role: UserRole

    @Column({ default: true })
    isActive: boolean

    @Column("simple-array", { default: "" })
    permissions: string[]

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @OneToMany(() => ExecutionHistory, executionHistory => executionHistory.user)
    executionHistory: ExecutionHistory[]
}