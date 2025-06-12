import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { ExecutionHistory, ExecutionStatus } from "../entity/ExecutionHistory";

export class ExecutionHistoryService {
    private static instance: ExecutionHistoryService;
    private executionHistoryRepository: Repository<ExecutionHistory>;

    private constructor() {
        this.executionHistoryRepository = AppDataSource.getRepository(ExecutionHistory);
    }

    public static getInstance(): ExecutionHistoryService {
        if (!ExecutionHistoryService.instance) {
            ExecutionHistoryService.instance = new ExecutionHistoryService();
        }
        return ExecutionHistoryService.instance;
    }

    public async createExecution(executionData: {
        userId: number;
        command: string;
        workingDirectory?: string;
        projectId?: number;
        stageId?: number;
    }): Promise<ExecutionHistory> {
        const execution = new ExecutionHistory();
        execution.userId = executionData.userId;
        execution.command = executionData.command;
        execution.workingDirectory = executionData.workingDirectory || null;
        execution.projectId = executionData.projectId || null;
        execution.stageId = executionData.stageId || null;
        execution.status = ExecutionStatus.RUNNING;

        return await this.executionHistoryRepository.save(execution);
    }

    public async updateExecution(executionId: number, updateData: {
        status?: ExecutionStatus;
        output?: string;
        errorOutput?: string;
        exitCode?: number;
        duration?: number;
    }): Promise<ExecutionHistory> {
        const execution = await this.executionHistoryRepository.findOne({
            where: { id: executionId }
        });

        if (!execution) {
            throw new Error("Execution not found");
        }

        if (updateData.status) execution.status = updateData.status;
        if (updateData.output !== undefined) execution.output = updateData.output;
        if (updateData.errorOutput !== undefined) execution.errorOutput = updateData.errorOutput;
        if (updateData.exitCode !== undefined) execution.exitCode = updateData.exitCode;
        if (updateData.duration !== undefined) execution.duration = updateData.duration;

        if (updateData.status && updateData.status !== ExecutionStatus.RUNNING) {
            execution.finishedAt = new Date();
        }

        return await this.executionHistoryRepository.save(execution);
    }

    public async getExecutionHistory(options: {
        userId?: number;
        projectId?: number;
        stageId?: number;
        status?: ExecutionStatus;
        limit?: number;
        offset?: number;
    }): Promise<{ executions: ExecutionHistory[], total: number }> {
        const queryBuilder = this.executionHistoryRepository.createQueryBuilder("execution")
            .leftJoinAndSelect("execution.user", "user")
            .leftJoinAndSelect("execution.project", "project")
            .leftJoinAndSelect("execution.stage", "stage");

        if (options.userId) {
            queryBuilder.andWhere("execution.userId = :userId", { userId: options.userId });
        }

        if (options.projectId) {
            queryBuilder.andWhere("execution.projectId = :projectId", { projectId: options.projectId });
        }

        if (options.stageId) {
            queryBuilder.andWhere("execution.stageId = :stageId", { stageId: options.stageId });
        }

        if (options.status) {
            queryBuilder.andWhere("execution.status = :status", { status: options.status });
        }

        queryBuilder.orderBy("execution.executedAt", "DESC");

        if (options.limit) {
            queryBuilder.limit(options.limit);
        }

        if (options.offset) {
            queryBuilder.offset(options.offset);
        }

        const [executions, total] = await queryBuilder.getManyAndCount();

        return { executions, total };
    }

    public async getExecutionById(executionId: number): Promise<ExecutionHistory | null> {
        return await this.executionHistoryRepository.findOne({
            where: { id: executionId },
            relations: ["user", "project", "stage"]
        });
    }

    public async deleteExecution(executionId: number): Promise<void> {
        await this.executionHistoryRepository.delete(executionId);
    }

    public async cleanupOldExecutions(olderThanDays: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.executionHistoryRepository
            .createQueryBuilder()
            .delete()
            .where("executedAt < :cutoffDate", { cutoffDate })
            .execute();

        return result.affected || 0;
    }
}