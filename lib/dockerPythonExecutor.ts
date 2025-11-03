import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';

const docker = new Docker();

export interface PythonExecutionOptions {
    code: string;
    examId?: string;
    files?: Array<{ fileName: string; content: Buffer }>;
    timeout?: number;
    memoryLimit?: number;
}

export interface PythonExecutionResult {
    output: string;
    error?: string;
    exitCode: number;
    executionTime: number;
    success: boolean;
}

export class DockerPythonExecutor {
    private readonly IMAGE_NAME = 'exam-python-executor:latest';
    private readonly MAX_OUTPUT_SIZE = 2 * 1024 * 1024; // 2MB
    private readonly DEFAULT_TIMEOUT = 20000; // 20 seconds
    private readonly DEFAULT_MEMORY = 512 * 1024 * 1024; // 512MB

    constructor() {
        this.ensureImage();
    }

    // Ensure Docker image exists
    private async ensureImage(): Promise<void> {
        try {
            await docker.getImage(this.IMAGE_NAME).inspect();
            console.log(`✅ Docker image ${this.IMAGE_NAME} found`);
        } catch (error) {
            console.log(`⚠️ Docker image ${this.IMAGE_NAME} not found. Please build it first.`);
        }
    }

    // Execute Python code in Docker container
    async execute(options: PythonExecutionOptions): Promise<PythonExecutionResult> {
        const startTime = Date.now();
        const containerId = `python_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let container: Docker.Container | null = null;

        try {
            // Prepare code file
            const tempDir = path.join(process.cwd(), 'temp', 'docker_python', containerId);
            await fs.mkdir(tempDir, { recursive: true });

            const codeFile = path.join(tempDir, 'main.py');
            await fs.writeFile(codeFile, options.code);

            // Copy exam files if provided
            if (options.files && options.files.length > 0) {
                for (const file of options.files) {
                    const filePath = path.join(tempDir, file.fileName);
                    await fs.writeFile(filePath, file.content);
                }
            }

            // Create container
            container = await docker.createContainer({
                name: containerId,
                Image: this.IMAGE_NAME,
                Cmd: ['python', '/workspace/main.py'],
                HostConfig: {
                    Memory: options.memoryLimit || this.DEFAULT_MEMORY,
                    MemorySwap: options.memoryLimit || this.DEFAULT_MEMORY,
                    CpuShares: 512,
                    NetworkMode: 'none', // No network access for security
                    AutoRemove: false,
                    Binds: [`${tempDir}:/workspace:ro`],
                },
                WorkingDir: '/workspace',
                User: 'pyuser',
                AttachStdout: true,
                AttachStderr: true,
            });

            console.log(`🐳 Container ${containerId} created`);

            // Start container
            await container.start();
            console.log(`▶️  Container ${containerId} started`);

            // Wait for container with timeout
            const timeout = options.timeout || this.DEFAULT_TIMEOUT;
            const waitPromise = container.wait();
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Execution timeout')), timeout)
            );

            const result = await Promise.race([waitPromise, timeoutPromise]);

            // Get logs
            const logStream = await container.logs({
                stdout: true,
                stderr: true,
                follow: false,
            });

            const output = await this.streamToString(logStream);
            const executionTime = Date.now() - startTime;

            // Cleanup temp directory
            await fs.rm(tempDir, { recursive: true, force: true });

            // Manually remove container
            try {
                await container.remove({ force: true });
                console.log(`🗑️ Container ${containerId} removed`);
            } catch (removeError) {
                console.warn(`⚠️ Could not remove container: ${removeError}`);
            }

            console.log(`✅ Container ${containerId} completed in ${executionTime}ms`);

            return {
                output: output.substring(0, this.MAX_OUTPUT_SIZE),
                exitCode: result.StatusCode,
                executionTime,
                success: result.StatusCode === 0,
            };

        } catch (error: any) {
            const executionTime = Date.now() - startTime;

            if (container) {
                try {
                    await container.remove({ force: true });
                    console.log(`🗑️ Container ${containerId} removed (error cleanup)`);
                } catch (cleanupError: any) {
                    if (!cleanupError.message.includes('already stopped') &&
                        !cleanupError.message.includes('No such container')) {
                        console.error('Container cleanup error:', cleanupError.message);
                    }
                }
            }

            console.error(`❌ Container ${containerId} failed:`, error.message);

            let errorMessage = error.message;
            if (error.message.includes('timeout')) {
                errorMessage = '⏱️ Execution timeout: Your code took too long to execute (20 seconds limit)';
            } else if (error.message.includes('memory')) {
                errorMessage = '💾 Memory limit exceeded: Your code used too much memory';
            }

            return {
                output: '',
                error: errorMessage,
                exitCode: -1,
                executionTime,
                success: false,
            };
        }
    }

    // Convert stream to string
    private async streamToString(stream: any): Promise<string> {
        // Check if stream is actually a Buffer (some Docker versions return Buffer directly)
        if (Buffer.isBuffer(stream)) {
            return this.parseDockerLogs(stream);
        }

        const chunks: Buffer[] = [];

        return new Promise((resolve, reject) => {
            // Check if stream has 'on' method
            if (typeof stream.on !== 'function') {
                // If not a stream, try to convert to string directly
                try {
                    const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);
                    resolve(this.parseDockerLogs(buffer));
                } catch (err) {
                    reject(new Error('Invalid stream format'));
                }
                return;
            }

            stream.on('data', (chunk: any) => {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                chunks.push(buffer);
            });

            stream.on('end', () => {
                const fullBuffer = Buffer.concat(chunks);
                resolve(this.parseDockerLogs(fullBuffer));
            });

            stream.on('error', reject);
        });
    }

    // Parse Docker log format (removes 8-byte headers)
    private parseDockerLogs(buffer: Buffer): string {
        const lines: string[] = [];
        let offset = 0;

        while (offset < buffer.length) {
            // Docker log format: [8 bytes header][payload]
            // Header: [stream type(1)][padding(3)][size(4)]

            if (offset + 8 > buffer.length) break;

            const header = buffer.slice(offset, offset + 8);
            const size = header.readUInt32BE(4);

            offset += 8;

            if (offset + size > buffer.length) break;

            const payload = buffer.slice(offset, offset + size);
            lines.push(payload.toString('utf-8'));

            offset += size;
        }

        return lines.join('');
    }

    // Clean up old containers
    async cleanup(): Promise<void> {
        try {
            const containers = await docker.listContainers({
                all: true,
                filters: {
                    name: ['python_'],
                },
            });

            const oldContainers = containers.filter(
                (c) => Date.now() - c.Created * 1000 > 3600000 // 1 hour old
            );

            for (const containerInfo of oldContainers) {
                try {
                    const container = docker.getContainer(containerInfo.Id);
                    await container.remove({ force: true });
                    console.log(`🧹 Removed old container: ${containerInfo.Names[0]}`);
                } catch (err) {
                    console.error(`Failed to remove container ${containerInfo.Id}:`, err);
                }
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    // Get Docker stats
    async getStats() {
        const containers = await docker.listContainers({
            filters: {
                name: ['python_'],
            },
        });

        return {
            activeContainers: containers.length,
            imageName: this.IMAGE_NAME,
        };
    }
}

// Cleanup interval
const executor = new DockerPythonExecutor();
setInterval(() => {
    executor.cleanup();
}, 300000); // Every 5 minutes

export default new DockerPythonExecutor();