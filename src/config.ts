import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface SnapshotSiteCliConfig {
  apiKey?: string;
  baseUrl?: string;
}

export function getConfigDir() {
  return path.join(os.homedir(), ".config", "snapshot-site");
}

export function getConfigPath() {
  return path.join(getConfigDir(), "config.json");
}

export async function readConfig(): Promise<SnapshotSiteCliConfig> {
  try {
    const content = await fs.readFile(getConfigPath(), "utf8");
    return JSON.parse(content) as SnapshotSiteCliConfig;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

export async function writeConfig(config: SnapshotSiteCliConfig) {
  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2), "utf8");
}

export async function clearConfig() {
  try {
    await fs.unlink(getConfigPath());
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}
