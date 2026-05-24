declare module '@blog/shared/env' {
    export const DEFAULT_APP_ENV: 'development';
    export const SUPPORTED_APP_ENVS: readonly ['development', 'staging', 'production'];

    export type AppEnv = (typeof SUPPORTED_APP_ENVS)[number];

    export interface LoadWorkspaceEnvOptions {
        repoRoot?: string;
        appDir?: string;
        appEnv?: string;
    }

    export interface WorkspaceEnvLoadResult {
        appEnv: AppEnv;
        appDir: string;
        repoRoot: string;
        loadedFiles: string[];
    }

    export function resolveNodeEnv(explicitNodeEnv?: string): string;
    export function resolveAppEnv(explicitAppEnv?: string): AppEnv;
    export function loadWorkspaceEnv(options?: LoadWorkspaceEnvOptions): WorkspaceEnvLoadResult;
}
