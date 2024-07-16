import { exec, ExecOptions } from "child_process";
import * as os from "os";

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

    public executeScript(script: string, args: string[]): Promise<ExecutionResult> {
        return new Promise<ExecutionResult>((resolve, reject) => {
            let stdout = "";
            let stderr = "";

            try {
                const substitutedScript = this.substituteArgs(script, args);
                const { command, options } = this.buildCommandAndOptions(substitutedScript);

                console.log(`Executing command: ${command}`);

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