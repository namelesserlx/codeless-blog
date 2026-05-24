import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFile = fileURLToPath(import.meta.url);
const serverRoot = path.resolve(path.dirname(currentFile), '..');
const packageManagerExec = process.env.npm_execpath;

if (!packageManagerExec) {
    console.error('[dev-runner] missing npm_execpath, cannot start child scripts');
    process.exit(1);
}

const childEntries = [
    { name: 'app', script: 'dev:app' },
    { name: 'metrics', script: 'metrics:worker:dev' },
];

let isShuttingDown = false;
const children = childEntries.map(({ name, script }) => {
    const child = spawn(process.execPath, [packageManagerExec, 'run', script], {
        cwd: serverRoot,
        env: process.env,
        stdio: 'inherit',
    });

    child.on('exit', (code, signal) => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        const exitCode = typeof code === 'number' ? code : 1;
        const reason = signal ? `signal ${signal}` : `code ${exitCode}`;
        console.error(`[dev-runner] ${name} exited with ${reason}, stopping others...`);

        children.forEach((entry) => {
            if (entry !== child && !entry.killed) {
                entry.kill('SIGTERM');
            }
        });

        process.exit(exitCode);
    });

    return child;
});

const shutdown = (signal) => {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    children.forEach((child) => {
        if (!child.killed) {
            child.kill(signal);
        }
    });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
