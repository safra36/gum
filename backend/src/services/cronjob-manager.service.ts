import { CronJob } from 'cron';
import { ProjectService } from './project.service';
import { Project } from '../entity/Project';
import { AppDataSource } from '../data-source';
import { IsNull, Not } from 'typeorm';

export class CronJobManager {
    private static instance: CronJobManager;
    private cronJobs: Map<number, CronJob> = new Map();
    private projectService: ProjectService;

    private constructor() {
        this.projectService = ProjectService.getInstance();
    }

    public static getInstance(): CronJobManager {
        if (!CronJobManager.instance) {
            CronJobManager.instance = new CronJobManager();
        }
        return CronJobManager.instance;
    }

    public async initializeCronJobs(): Promise<void> {
        console.log('Initializing cron jobs...');
        
        try {
            // Fetch all projects with cron jobs
            const projects = await AppDataSource.getRepository(Project).find({
                where: {
                    cronJob: Not(IsNull())
                }
            });

            // Initialize cron job for each project
            for (const project of projects) {
                this.setupCronJob(project);
            }

            console.log(`Initialized ${projects.length} cron jobs.`);
        } catch (error) {
            console.error('Error initializing cron jobs:', error);
        }
    }

    private setupCronJob(project: Project): void {
        if (project.cronJob) {
            const job = new CronJob(project.cronJob, () => {
                this.projectService.executeProjectStaging(project.id);
            });

            job.start();
            this.cronJobs.set(project.id, job);
            console.log(`Cron job set up for project "${project.title}"`);
        }
    }

    public updateCronJob(project: Project): void {
        // Stop existing job if it exists
        this.stopCronJob(project.id);

        // Set up new job if cronJob is defined
        if (project.cronJob) {
            this.setupCronJob(project);
        }
    }

    public stopCronJob(projectId: number): void {
        const existingJob = this.cronJobs.get(projectId);
        if (existingJob) {
            existingJob.stop();
            this.cronJobs.delete(projectId);
            console.log(`Stopped cron job for project ${projectId}`);
        }
    }
}