#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveApiKey = resolveApiKey;
exports.resolveBaseUrl = resolveBaseUrl;
exports.downloadFile = downloadFile;
exports.saveScreenshotAsset = saveScreenshotAsset;
exports.saveCompareAssets = saveCompareAssets;
exports.buildProgram = buildProgram;
exports.run = run;
const commander_1 = require("commander");
const sdk_1 = require("@snapshot-site/sdk");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("./config");
async function resolveApiKey(optionApiKey) {
    const config = await (0, config_1.readConfig)();
    const apiKey = optionApiKey ?? process.env.SNAPSHOT_SITE_API_KEY ?? config.apiKey;
    if (!apiKey) {
        throw new Error("Missing API key. Use snapshot-site login, --api-key, or set SNAPSHOT_SITE_API_KEY.");
    }
    return apiKey;
}
async function resolveBaseUrl(optionBaseUrl) {
    const config = await (0, config_1.readConfig)();
    return optionBaseUrl ?? process.env.SNAPSHOT_SITE_BASE_URL ?? config.baseUrl ?? "https://api.prod.ss.snapshot-site.com";
}
async function createClient(baseUrl, apiKey) {
    return new sdk_1.SnapshotSiteClient({
        apiKey: await resolveApiKey(apiKey),
        baseUrl: await resolveBaseUrl(baseUrl),
        userAgent: "@snapshot-site/cli/0.1.0",
    });
}
async function writeOutput(outputPath, payload) {
    const content = JSON.stringify(payload, null, 2);
    if (!outputPath) {
        process.stdout.write(`${content}\n`);
        return;
    }
    await promises_1.default.writeFile(outputPath, content, "utf8");
    process.stdout.write(`Wrote output to ${outputPath}\n`);
}
async function downloadFile(url, outputPath, fetchImpl = fetch) {
    const response = await fetchImpl(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await promises_1.default.mkdir(node_path_1.default.dirname(outputPath), { recursive: true });
    await promises_1.default.writeFile(outputPath, buffer);
}
function sanitizeFileName(value) {
    return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "snapshot";
}
function extFromUrl(url, fallback) {
    try {
        const parsed = new URL(url);
        const ext = node_path_1.default.extname(parsed.pathname);
        return ext || fallback;
    }
    catch {
        return fallback;
    }
}
async function saveScreenshotAsset(link, saveImage, fetchImpl = fetch) {
    if (!saveImage)
        return null;
    const explicitPath = typeof saveImage === "string" ? saveImage : undefined;
    const outputPath = explicitPath ?? node_path_1.default.resolve(process.cwd(), `snapshot${extFromUrl(link, ".png")}`);
    await downloadFile(link, outputPath, fetchImpl);
    process.stdout.write(`Saved image to ${outputPath}\n`);
    return outputPath;
}
async function saveCompareAssets(links, saveImage, fetchImpl = fetch) {
    if (!saveImage)
        return [];
    const outputDir = typeof saveImage === "string" ? node_path_1.default.resolve(saveImage) : node_path_1.default.resolve(process.cwd(), "snapshot-site-compare");
    await promises_1.default.mkdir(outputDir, { recursive: true });
    const saved = [];
    for (const item of links) {
        if (!item.link)
            continue;
        const outputPath = node_path_1.default.join(outputDir, `${sanitizeFileName(item.name)}${extFromUrl(item.link, ".png")}`);
        await downloadFile(item.link, outputPath, fetchImpl);
        saved.push(outputPath);
        process.stdout.write(`Saved ${item.name} to ${outputPath}\n`);
    }
    return saved;
}
async function readJsonFile(inputPath) {
    const content = await promises_1.default.readFile(inputPath, "utf8");
    return JSON.parse(content);
}
function buildProgram() {
    const program = new commander_1.Command();
    program
        .name("snapshot-site")
        .description("CLI for the Snapshot Site API")
        .version("0.1.0")
        .option("--api-key <key>", "Snapshot Site API key")
        .option("--base-url <url>", "Override API base URL");
    program
        .command("login")
        .description("Persist API key and optional base URL in a local config file")
        .requiredOption("--api-key <key>", "Snapshot Site API key")
        .option("--base-url <url>", "Persist a custom API base URL")
        .action(async (options) => {
        await (0, config_1.writeConfig)({
            apiKey: options.apiKey,
            baseUrl: options.baseUrl,
        });
        process.stdout.write(`Saved config to ${(0, config_1.getConfigPath)()}\n`);
    });
    program
        .command("logout")
        .description("Remove the local Snapshot Site CLI config")
        .action(async () => {
        await (0, config_1.clearConfig)();
        process.stdout.write(`Removed config from ${(0, config_1.getConfigPath)()}\n`);
    });
    program
        .command("whoami-config")
        .description("Show the current CLI config path and whether credentials are configured")
        .action(async () => {
        const config = await (0, config_1.readConfig)();
        const payload = {
            path: (0, config_1.getConfigPath)(),
            hasApiKey: Boolean(config.apiKey),
            baseUrl: config.baseUrl ?? null,
        };
        await writeOutput(undefined, payload);
    });
    program
        .command("screenshot")
        .description("Take a screenshot")
        .requiredOption("--url <url>", "Page URL")
        .option("--width <number>", "Viewport width")
        .option("--height <number>", "Viewport height")
        .option("--format <format>", "png, jpeg, jpg, webp, pdf, base64, html")
        .option("--delay <seconds>", "Delay before capture")
        .option("--full-size", "Capture full page")
        .option("--hide-cookie", "Hide cookie banners")
        .option("--hide <selector>", "Selectors to hide")
        .option("--javascript-code <code>", "Custom JavaScript to inject")
        .option("--language <locale>", "Language locale", "en-US")
        .option("--country <code>", "Country code", "US")
        .option("--output <file>", "Write JSON response to file")
        .option("--save-image [path]", "Download the returned screenshot or PDF")
        .action(async (options) => {
        const globalOptions = program.opts();
        const client = await createClient(globalOptions.baseUrl, globalOptions.apiKey);
        const payload = {
            url: options.url,
            width: options.width ? Number(options.width) : undefined,
            height: options.height ? Number(options.height) : undefined,
            format: options.format,
            delay: options.delay ? Number(options.delay) : undefined,
            fullSize: options.fullSize || undefined,
            hideCookie: options.hideCookie || undefined,
            hide: options.hide,
            javascriptCode: options.javascriptCode,
            language: options.language,
            country: options.country,
        };
        const result = await client.screenshot(payload);
        await writeOutput(options.output, result);
        if (result.link) {
            await saveScreenshotAsset(result.link, options.saveImage);
        }
    });
    program
        .command("analyze")
        .description("Analyze a webpage")
        .requiredOption("--url <url>", "Page URL")
        .option("--width <number>", "Viewport width")
        .option("--height <number>", "Viewport height")
        .option("--format <format>", "png, jpeg, webp, pdf, html")
        .option("--delay <seconds>", "Delay before capture")
        .option("--full-size", "Capture full page")
        .option("--hide-cookie", "Hide cookie banners")
        .option("--hide <selector>", "Selectors to hide")
        .option("--javascript-code <code>", "Custom JavaScript to inject")
        .option("--language <locale>", "Language locale", "en-US")
        .option("--wait-for-dom", "Wait for DOM before capture")
        .option("--enable-summary", "Enable content summary")
        .option("--enable-quality", "Enable page quality analysis")
        .option("--force-refresh", "Bypass analysis cache")
        .option("--output <file>", "Write JSON response to file")
        .option("--save-image [path]", "Download the returned screenshot or PDF")
        .action(async (options) => {
        const globalOptions = program.opts();
        const client = await createClient(globalOptions.baseUrl, globalOptions.apiKey);
        const payload = {
            url: options.url,
            width: options.width ? Number(options.width) : undefined,
            height: options.height ? Number(options.height) : undefined,
            format: options.format,
            delay: options.delay ? Number(options.delay) : undefined,
            fullSize: options.fullSize || undefined,
            hideCookie: options.hideCookie || undefined,
            hide: options.hide,
            javascriptCode: options.javascriptCode,
            language: options.language,
            waitForDom: options.waitForDom || undefined,
            enableSummary: options.enableSummary || undefined,
            enableQuality: options.enableQuality || undefined,
            forceRefresh: options.forceRefresh || undefined,
        };
        const result = await client.analyze(payload);
        await writeOutput(options.output, result);
        if (result.screenshot?.link) {
            await saveScreenshotAsset(result.screenshot.link, options.saveImage);
        }
    });
    program
        .command("compare")
        .description("Generate a visual diff between two states")
        .option("--input <file>", "Read full compare payload from JSON file")
        .option("--before-url <url>", "Before page URL")
        .option("--after-url <url>", "After page URL")
        .option("--before-image-url <url>", "Before PNG URL")
        .option("--after-image-url <url>", "After PNG URL")
        .option("--width <number>", "Shared width for both sources")
        .option("--height <number>", "Shared height for both sources")
        .option("--delay <seconds>", "Shared delay for both sources")
        .option("--full-size", "Capture full page")
        .option("--hide-cookie", "Hide cookie banners")
        .option("--hide <selector>", "Selectors to hide")
        .option("--javascript-code <code>", "Custom JavaScript to inject")
        .option("--language <locale>", "Language locale", "en-US")
        .option("--threshold <number>", "Diff threshold", "0.1")
        .option("--output <file>", "Write JSON response to file")
        .option("--save-image [dir]", "Download before, after, and diff images")
        .action(async (options) => {
        const globalOptions = program.opts();
        const client = await createClient(globalOptions.baseUrl, globalOptions.apiKey);
        const payload = options.input
            ? await readJsonFile(options.input)
            : {
                before: {
                    url: options.beforeUrl,
                    imageUrl: options.beforeImageUrl,
                    width: options.width ? Number(options.width) : undefined,
                    height: options.height ? Number(options.height) : undefined,
                    delay: options.delay ? Number(options.delay) : undefined,
                    fullSize: options.fullSize || undefined,
                    hideCookie: options.hideCookie || undefined,
                    hide: options.hide,
                    javascriptCode: options.javascriptCode,
                    language: options.language,
                },
                after: {
                    url: options.afterUrl,
                    imageUrl: options.afterImageUrl,
                    width: options.width ? Number(options.width) : undefined,
                    height: options.height ? Number(options.height) : undefined,
                    delay: options.delay ? Number(options.delay) : undefined,
                    fullSize: options.fullSize || undefined,
                    hideCookie: options.hideCookie || undefined,
                    hide: options.hide,
                    javascriptCode: options.javascriptCode,
                    language: options.language,
                },
                threshold: options.threshold ? Number(options.threshold) : undefined,
            };
        const result = await client.compare(payload);
        await writeOutput(options.output, result);
        await saveCompareAssets([
            { name: "before", link: result.before?.link },
            { name: "after", link: result.after?.link },
            { name: "diff", link: result.diff?.link },
        ], options.saveImage);
    });
    return program;
}
async function run(argv = process.argv) {
    await buildProgram().parseAsync(argv);
}
if (require.main === module) {
    run().catch((error) => {
        const message = error instanceof Error ? error.message : "Unknown CLI error";
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    });
}
