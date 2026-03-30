export interface SnapshotSiteCliConfig {
    apiKey?: string;
    baseUrl?: string;
}
export declare function getConfigDir(): string;
export declare function getConfigPath(): string;
export declare function readConfig(): Promise<SnapshotSiteCliConfig>;
export declare function writeConfig(config: SnapshotSiteCliConfig): Promise<void>;
export declare function clearConfig(): Promise<void>;
