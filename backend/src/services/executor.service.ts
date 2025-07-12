import { exec, ExecOptions, spawn } from "child_process";
import * as os from "os";
import * as fs from "fs";
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

    public executeScriptWithStreamingAndHistory(
        script: string, 
        args: string[], 
        executionId: string,
        context: ExecutionContext
    ): Promise<ExecutionResult> {
        const startTime = Date.now();
        
        return new Promise<ExecutionResult>(async (resolve, reject) => {
            let executionRecord;
            
            try {
                // Create execution history record
                executionRecord = await this.executionHistoryService.createExecution({
                    userId: context.userId,
                    command: this.substituteArgs(script, args),
                    workingDirectory: context.workingDirectory,
                    projectId: context.projectId,
                    stageId: context.stageId
                });

                const result = await this.executeScriptWithStreaming(script, args, executionId, context.workingDirectory, context);
                const duration = Date.now() - startTime;

                // Update execution history with result
                await this.executionHistoryService.updateExecution(executionRecord.id, {
                    status: result.exitCode === 0 ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED,
                    output: result.stdout,
                    errorOutput: result.stderr,
                    exitCode: result.exitCode,
                    duration
                });

                resolve(result);
            } catch (error) {
                const duration = Date.now() - startTime;
                
                if (executionRecord) {
                    // Update execution history with error
                    await this.executionHistoryService.updateExecution(executionRecord.id, {
                        status: ExecutionStatus.FAILED,
                        errorOutput: error instanceof Error ? error.message : String(error),
                        duration
                    });
                }

                reject(error);
            }
        });
    }

    public executeScriptWithStreaming(
        script: string, 
        args: string[], 
        executionId: string,
        workingDirectory?: string,
        context?: ExecutionContext
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
                let spawnOptions: any;
                
                if (platform === 'win32') {
                    command = 'cmd.exe';
                    commandArgs = ['/c', substitutedScript];
                    spawnOptions = {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        shell: false
                    };
                } else {
                    // Use absolute path to sh
                    command = '/bin/sh';
                    commandArgs = ['-c', substitutedScript];
                    spawnOptions = {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        shell: false
                    };
                }
                
                // Set working directory if provided
                if (workingDirectory) {
                    spawnOptions.cwd = workingDirectory;
                }

                const childProcess = spawn(command, commandArgs, spawnOptions);

                // Handle spawn errors
                childProcess.on('error', (error) => {
                    console.error(`Failed to start process: ${error.message}`);
                    if (error.message.includes('ENOENT')) {
                        const errorMsg = `Failed to execute command: ${command}. Please ensure bash is installed at /usr/bin/bash.`;
                        this.executionEmitter.emit(`execution:${executionId}:error`, errorMsg);
                        reject(new Error(errorMsg));
                    } else {
                        this.executionEmitter.emit(`execution:${executionId}:error`, error.message);
                        reject(error);
                    }
                    return;
                });

                // Stream stdout in real-time
                childProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    this.executionEmitter.emit(`execution:${executionId}:stdout`, output);
                });

                // Stream stderr in real-time
                childProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    this.executionEmitter.emit(`execution:${executionId}:stderr`, output);
                });

                childProcess.on("close", (code) => {
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

                // Error handler already added above
            } catch (error) {
                this.executionEmitter.emit(`execution:${executionId}:error`, error instanceof Error ? error.message : String(error));
                reject(error);
            }
        });
    }

    public executeScriptWithVariables(script: string, args: string[], workingDirectory?: string, variables?: Map<string, string>): Promise<{ result: ExecutionResult, variables: Map<string, string> }> {
        console.log('=== executeScriptWithVariables called ===');
        console.log('Script:', script);
        return new Promise<{ result: ExecutionResult, variables: Map<string, string> }>((resolve, reject) => {
            let stdout = "";
            let stderr = "";

            try {
                // Process variable definitions and substitutions
                const { processedScript, variables: updatedVariables, captureCommands } = this.processVariableDefinitions(script, variables);
                const substitutedScript = this.substituteArgs(processedScript, args);
                
                // If we have capture commands, add variable output at the end
                let finalScript = substitutedScript;
                if (captureCommands.length > 0) {
                    const lines = finalScript.split('\n');
                    
                    // Add variable output at the end for next stage
                    lines.push('');
                    lines.push('# Variable capture for next stage');
                    captureCommands.forEach(cmd => {
                        lines.push(`echo "VAROUT:${cmd.varName}:${cmd.expression}"`);
                    });
                    
                    finalScript = lines.join('\n');
                }
                
                const { command, options } = this.buildCommandAndOptions(finalScript, workingDirectory);

                const childProcess = exec(command, options, (error, stdoutData, stderrData) => {
                    stdout += stdoutData;
                    stderr += stderrData;
                });

                childProcess.on("close", (code) => {
                    console.log({
                        stdout,
                        stderr,
                        exitCode: code
                    });
                    
                    // Extract captured variables from stdout
                    const finalVariables = new Map(updatedVariables);
                    const lines = stdout.split('\n');
                    let cleanStdout = '';
                    
                    for (const line of lines) {
                        const varMatch = line.match(/^VAROUT:([^:]+):(.*)$/);
                        if (varMatch) {
                            const [, varName, varValue] = varMatch;
                            finalVariables.set(varName, varValue);
                            console.log(`Captured variable: ${varName} = ${varValue}`);
                        } else {
                            cleanStdout += line + '\n';
                        }
                    }
                    
                    // Remove trailing newline if it was added
                    cleanStdout = cleanStdout.replace(/\n$/, '');
                    
                    resolve({
                        result: {
                            stdout: cleanStdout,
                            stderr,
                            exitCode: code
                        },
                        variables: finalVariables
                    });
                });

                childProcess.on("error", (error) => {
                    reject(error);
                });
            } catch (error) {
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
                

                const childProcess = exec(command, options, (error, stdoutData, stderrData) => {
                    stdout += stdoutData;
                    stderr += stderrData;
                });

                childProcess.on("close", (code) => {
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

                childProcess.on("error", (error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }


    private substituteArgs(script: string, args: string[]): string {
        // First substitute numbered arguments
        let result = script.replace(/\$(\d+)/g, (match, index) => {
            const argIndex = parseInt(index, 10) - 1;
            if (argIndex < 0 || argIndex >= args.length) {
                throw new Error(`Argument $${index} is not defined`);
            }
            return args[argIndex];
        });
        
        return result;
    }

    public processVariableDefinitions(script: string, existingVariables: Map<string, string> = new Map()): { processedScript: string, variables: Map<string, string>, captureCommands: Array<{varName: string, expression: string}> } {
        const variables = new Map(existingVariables);
        const lines = script.split('\n');
        const processedLines: string[] = [];
        const captureCommands: Array<{varName: string, expression: string}> = [];
        
        console.log('Processing script:', script);
        console.log('Existing variables:', Object.fromEntries(existingVariables));
        
        for (const line of lines) {
            // Check for #DEFINE VarName=Value (case insensitive)
            const defineMatch = line.match(/^#DEFINE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/i);
            if (defineMatch) {
                const [, varName, varValue] = defineMatch;
                const trimmedValue = varValue.trim();
                // Remove quotes if present
                const cleanValue = trimmedValue.replace(/^["'](.*)["']$/, '$1');
                
                // Check if this is a dynamic expression (contains $ or backticks or $())
                if (cleanValue.includes('$') || cleanValue.includes('`') || cleanValue.match(/\$\(/)) {
                    // This is a dynamic expression - replace with shell variable assignment
                    processedLines.push(`${varName}=${cleanValue}`);
                    // Store shell variable reference for substitution
                    variables.set(varName, `$${varName}`);
                    // Add to capture commands for next stage
                    captureCommands.push({
                        varName,
                        expression: `$${varName}`
                    });
                    console.log(`Defined dynamic variable: ${varName} = ${cleanValue}`);
                } else {
                    // This is a static value - store it directly
                    variables.set(varName, cleanValue);
                    console.log(`Defined static variable: ${varName} = ${cleanValue}`);
                }
                
                // Continue to next line (we either added shell assignment or skipped)
                continue;
            }
            
            // Substitute variables in order of definition (preserve insertion order)
            let processedLine = line;
            
            // Sort variables by name length (longest first) to avoid partial replacements
            const sortedVariables = Array.from(variables.entries()).sort((a, b) => b[0].length - a[0].length);
            
            for (const [varName, varValue] of sortedVariables) {
                // Use multiple patterns for variable substitution:
                // 1. #VarName followed by word boundary
                // 2. #{VarName} for explicit variable boundaries
                const patterns = [
                    new RegExp(`#\\{${varName}\\}`, 'g'),  // #{VarName}
                    new RegExp(`#${varName}(?![A-Za-z0-9_])`, 'g')  // #VarName not followed by word char
                ];
                
                for (const regex of patterns) {
                    const before = processedLine;
                    processedLine = processedLine.replace(regex, varValue);
                    if (before !== processedLine) {
                        console.log(`Substituted: ${before} -> ${processedLine}`);
                    }
                }
            }
            
            processedLines.push(processedLine);
        }
        
        console.log('Final variables:', Object.fromEntries(variables));
        console.log('Capture commands:', captureCommands);
        console.log('Processed script:', processedLines.join('\n'));
        
        return {
            processedScript: processedLines.join('\n'),
            variables,
            captureCommands
        };
    }


    private findBash(): string {
        const platform = os.platform();
        
        if (platform === 'win32') {
            return 'cmd.exe';
        }
        
        // For Unix systems, use default shell (bash/sh)
        console.log('Using system default shell');
        return 'bash';
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

        // Just use the script directly and let exec handle the shell
        command = script;
        
        return { command, options };
    }
}