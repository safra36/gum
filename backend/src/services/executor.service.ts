import { exec, ExecOptions } from "child_process";
import * as os from "os";
import { GitLogEntry } from "../types/executor.service";

interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

export class ExecutorService {
    private static instance: ExecutorService;

    private constructor() {}

    public static getInstance(): ExecutorService {
        if (!ExecutorService.instance) {
            ExecutorService.instance = new ExecutorService();
        }
        return ExecutorService.instance;
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

    public executeScript(script: string, args: string[]): Promise<ExecutionResult> {
        return new Promise<ExecutionResult>((resolve, reject) => {
            let stdout = "";
            let stderr = "";

            try {
                const substitutedScript = this.substituteArgs(script, args);
                const { command, options } = this.buildCommandAndOptions(substitutedScript);
                

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

    private buildCommandAndOptions(script: string): { command: string, options: ExecOptions } {
        const platform = os.platform();
        let command: string;
        let options: ExecOptions = {};

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