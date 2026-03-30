#!/usr/bin/env node
import { Command } from "commander";
export declare function resolveApiKey(optionApiKey?: string): Promise<string>;
export declare function resolveBaseUrl(optionBaseUrl?: string): Promise<string>;
export declare function downloadFile(url: string, outputPath: string, fetchImpl?: typeof fetch): Promise<void>;
export declare function saveScreenshotAsset(link: string, saveImage?: string | boolean, fetchImpl?: typeof fetch): Promise<string | null>;
export declare function saveCompareAssets(links: Array<{
    name: string;
    link?: string | null;
}>, saveImage?: string | boolean, fetchImpl?: typeof fetch): Promise<string[]>;
export declare function buildProgram(): Command;
export declare function run(argv?: string[]): Promise<void>;
