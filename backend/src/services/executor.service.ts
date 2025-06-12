import { exec, ExecOptions, spawn } from "child_process";
import * as os from "os";
import { GitLogEntry } from "../types/executor.service";
import { ExecutionHistoryService } from "./execution-history.service";
import { ExecutionStatus } from "../entity/ExecutionHistory";
import { EventEmitter } from "events";

interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

interface ExecutionContext {
    userId: number;
    projectId?: number;
    stageId?: number;
    workingDirectory?: string;
}

export class ExecutorService {
    private static instance: ExecutorService;
    private executionHistoryService: ExecutionHistoryService;
    private executionEmitter: EventEmitter;

    private constructor() {
        this.executionHistoryService = ExecutionHistoryService.getInstance();
        this.executionEmitter = new EventEmitter();
    }

    public static getInstance(): ExecutorService {
        if (!ExecutorService.instance) {
            ExecutorService.instance = new ExecutorService();
        }
        return ExecutorService.instance;
    }

    public getExecutionEmitter(): EventEmitter {
        return this.executionEmitter;
    }


    async extractGitLogs(repoPath: string, ...additionalArgs: string[]): Promise<GitLogEntry[]> {

        const executor = ExecutorService.getInstance();

        console.log(repoPath);
        
        
        const script = `
          cd "$1"
          git log \
          --pretty=format:'{%n "commit": "%H",%n "author": "%aN <%aE>",%n "date": "%ad",%n "message": "%f"%n},' \
          $@
        `;
      
        try {
          const result = await executor.executeScript(script, [repoPath, ...additionalArgs]);
      
          if (result.exitCode !== 0) {
            throw new Error(`Git log extraction failed: ${result.stderr}`);
          }
      
          // Process the output to create valid JSON
          let jsonString = '[' + result.stdout.trim().replace(/,\s*$/, '') + ']';
          
          // Parse the JSON string
          const gitLogs: GitLogEntry[] = JSON.parse(jsonString);
          
          return gitLogs.slice(0, 10);

        } catch (error) {
          console.error('Error extracting git logs:', error);
          throw error;
        }
    }

    public async executeScriptWithHistory(
        script: string, 
        args: string[], 
        context: ExecutionContext
    ): Promise<ExecutionResult> {
        const startTime = Date.now();
        
        // Create execution history record
        const execution = await this.executionHistoryService.createExecution({
            userId: context.userId,
            command: this.substituteArgs(script, args),
            workingDirectory: context.workingDirectory,
            projectId: context.projectId,
            stageId: context.stageId
        });

        try {
            const result = await this.executeScript(script, args, context.workingDirectory);
            const duration = Date.now() - startTime;

            // Update execution history with result
            await this.executionHistoryService.updateExecution(execution.id, {
                status: result.exitCode === 0 ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED,
                output: result.stdout,
                errorOutput: result.stderr,
                exitCode: result.exitCode,
                duration
            });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Update execution history with error
            await this.executionHistoryService.updateExecution(execution.id, {
                status: ExecutionStatus.FAILED,
                errorOutput: error instanceof Error ? error.message : String(error),
                duration
            });

            throw error;
        }
    }

    public executeScriptWithStreaming(
        script: string, 
        args: string[], 
        executionId: string,
        workingDirectory?: string
    ): Promise<ExecutionResult> {
        return new Promise<ExecutionResult>((resolve, reject) => {
            let stdout = "";
            let stderr = "";

            try {
                const substitutedScript = this.substituteArgs(script, args);
                
                // For streaming, we'll use spawn instead of exec to get real-time output
                const platform = os.platform();
                let command: string;
                let commandArgs: string[];
                
                if (platform === 'win32') {
                    command = 'cmd.exe';
                    commandArgs = ['/c', substitutedScript];
                } else {
                    command = '/bin/bash';
                    commandArgs = ['-c', substitutedScript];
                }

                const spawnOptions: any = {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: false
                };
                
                // Set working directory if provided
                if (workingDirectory) {
                    spawnOptions.cwd = workingDirectory;
                }

                const process = spawn(command, commandArgs, spawnOptions);

                // Stream stdout in real-time
                process.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    this.executionEmitter.emit(`execution:${executionId}:stdout`, output);
                });

                // Stream stderr in real-time
                process.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    this.executionEmitter.emit(`execution:${executionId}:stderr`, output);
                });

                process.on("close", (code) => {
                    console.log("SSE - Process closed with code:", code);
                    console.log({
                        stdout,
                        stderr,
                        exitCode: code
                    });
                    
                    console.log(`SSE - Emitting close event for execution: ${executionId}`);
                    this.executionEmitter.emit(`execution:${executionId}:close`, {
                        exitCode: code,
                        stdout,
                        stderr
                    });
                    
                    resolve({
                        stdout,
                        stderr,
                        exitCode: code
                    });
                });

                process.on("error", (error) => {
                    this.executionEmitter.emit(`execution:${executionId}:error`, error.message);
                    reject(error);
                });
            } catch (error) {
                this.executionEmitter.emit(`execution:${executionId}:error`, error instanceof Error ? error.message : String(error));
                reject(error);
            }
        });
    }

    public executeScript(script: string, args: string[], workingDirectory?: string): Promise<ExecutionResult> {
        return new Promise<ExecutionResult>((resolve, reject) => {
            let stdout = "";
            let stderr = "";

            try {
                const substitutedScript = this.substituteArgs(script, args);
                const { command, options } = this.buildCommandAndOptions(substitutedScript, workingDirectory);
                

                const process = exec(command, options, (error, stdoutData, stderrData) => {
                    stdout += stdoutData;
                    stderr += stderrData;
                });

                process.on("close", (code) => {
                    console.log({
                        stdout,
                        stderr,
                        exitCode: code
                    });
                    
                    resolve({
                        stdout,
                        stderr,
                        exitCode: code
                    });
                });

                process.on("error", (error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    private substituteArgs(script: string, args: string[]): string {
        return script.replace(/\$(\d+)/g, (match, index) => {
            const argIndex = parseInt(index, 10) - 1;
            if (argIndex < 0 || argIndex >= args.length) {
                throw new Error(`Argument $${index} is not defined`);
            }
            return args[argIndex];
        });
    }

    async getGitBranches(repoPath: string): Promise<string[]> {
        const script = `
            cd "$1"
            git branch --format="%(refname:short)"
        `;

        try {
            const result = await this.executeScript(script, [repoPath]);

            if (result.exitCode !== 0) {
                throw new Error(`Failed to get git branches: ${result.stderr}`);
            }

            return result.stdout.trim().split('\n');
        } catch (error) {
            console.error('Error getting git branches:', error);
            throw error;
        }
    }

    async getCurrentGitBranch(repoPath: string): Promise<string> {
        const script = `
            cd "$1"
            git rev-parse --abbrev-ref HEAD
        `;

        try {
            const result = await this.executeScript(script, [repoPath]);

            if (result.exitCode !== 0) {
                throw new Error(`Failed to get current git branch: ${result.stderr}`);
            }

            return result.stdout.trim();
        } catch (error) {
            console.error('Error getting current git branch:', error);
            throw error;
        }
    }

    async switchGitBranch(repoPath: string, branch: string): Promise<void> {
        const script = `
            cd "$1"
            git checkout "$2"
        `;

        try {
            const result = await this.executeScript(script, [repoPath, branch]);

            if (result.exitCode !== 0) {
                throw new Error(`Failed to switch git branch: ${result.stderr}`);
            }
        } catch (error) {
            console.error('Error switching git branch:', error);
            throw error;
        }
    }

    async revertToCommit(repoPath: string, commitHash: string): Promise<void> {
        const script = `
            cd "$1"
            git checkout "$2"
        `;

        try {
            const result = await this.executeScript(script, [repoPath, commitHash]);

            if (result.exitCode !== 0) {
                throw new Error(`Failed to revert to commit: ${result.stderr}`);
            }
        } catch (error) {
            console.error('Error reverting to commit:', error);
            throw error;
        }
    }

    async switchToHead(repoPath: string, branch: string): Promise<void> {
        const script = `
            cd "$1"
            git checkout "$2"
            git pull origin "$2"
        `;

        try {
            const result = await this.executeScript(script, [repoPath, branch]);

            if (result.exitCode !== 0) {
                throw new Error(`Failed to switch to branch head: ${result.stderr}`);
            }
        } catch (error) {
            console.error('Error switching to branch head:', error);
            throw error;
        }
    }

    private buildCommandAndOptions(script: string, workingDirectory?: string): { command: string, options: ExecOptions } {
        const platform = os.platform();
        let command: string;
        let options: ExecOptions = {};

        // Set working directory if provided
        if (workingDirectory) {
            options.cwd = workingDirectory;
        }

        // Escape single quotes and dollar signs in the script
        const escapedScript = script.replace(/'/g, "'\\''").replace(/\$/g, '\\$');

        switch (platform) {
            case 'win32':
                // For Windows, we'll use a temporary file approach
                const tempFile = `%TEMP%\\script_${Date.now()}.bat`;
                command = `(echo ${escapedScript.replace(/\n/g, ' & echo ')}) > ${tempFile} && ${tempFile}`;
                options.shell = 'cmd.exe';
                break;
            case 'darwin':
            case 'linux':
                // For Unix-like systems, we can use heredoc
                command = `/bin/bash -c 'cat << EOF | /bin/bash\n${escapedScript}\nEOF'`;
                options.shell = '/bin/bash';
                break;
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }

        return { command, options };
    }
}