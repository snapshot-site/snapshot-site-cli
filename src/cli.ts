#!/usr/bin/env node
import { Command } from "commander";
import { SnapshotSiteClient, type AnalyzeRequest, type ScreenshotRequest, type VisualDiffRequest } from "@snapshot-site/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { clearConfig, getConfigPath, readConfig, writeConfig } from "./config";

export async function resolveApiKey(optionApiKey?: string) {
  const config = await readConfig();
  const apiKey = optionApiKey ?? process.env.SNAPSHOT_SITE_API_KEY ?? config.apiKey;
  if (!apiKey) {
    throw new Error("Missing API key. Use snapshot-site login, --api-key, or set SNAPSHOT_SITE_API_KEY.");
  }

  return apiKey;
}

export async function resolveBaseUrl(optionBaseUrl?: string) {
  const config = await readConfig();
  return optionBaseUrl ?? process.env.SNAPSHOT_SITE_BASE_URL ?? config.baseUrl ?? "https://api.prod.ss.snapshot-site.com";
}

async function createClient(baseUrl?: string, apiKey?: string) {
  return new SnapshotSiteClient({
    apiKey: await resolveApiKey(apiKey),
    baseUrl: await resolveBaseUrl(baseUrl),
    userAgent: "@snapshot-site/cli/0.1.0",
  });
}

async function writeOutput(outputPath: string | undefined, payload: unknown) {
  const content = JSON.stringify(payload, null, 2);

  if (!outputPath) {
    process.stdout.write(`${content}\n`);
    return;
  }

  await fs.writeFile(outputPath, content, "utf8");
  process.stdout.write(`Wrote output to ${outputPath}\n`);
}

export async function downloadFile(url: string, outputPath: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "snapshot";
}

function extFromUrl(url: string, fallback: string) {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname);
    return ext || fallback;
  } catch {
    return fallback;
  }
}

export async function saveScreenshotAsset(link: string, saveImage?: string | boolean, fetchImpl: typeof fetch = fetch) {
  if (!saveImage) return null;

  const explicitPath = typeof saveImage === "string" ? saveImage : undefined;
  const outputPath = explicitPath ?? path.resolve(process.cwd(), `snapshot${extFromUrl(link, ".png")}`);

  await downloadFile(link, outputPath, fetchImpl);
  process.stdout.write(`Saved image to ${outputPath}\n`);
  return outputPath;
}

export async function saveCompareAssets(
  links: Array<{ name: string; link?: string | null }>,
  saveImage?: string | boolean,
  fetchImpl: typeof fetch = fetch
) {
  if (!saveImage) return [];

  const outputDir =
    typeof saveImage === "string" ? path.resolve(saveImage) : path.resolve(process.cwd(), "snapshot-site-compare");

  await fs.mkdir(outputDir, { recursive: true });

  const saved: string[] = [];
  for (const item of links) {
    if (!item.link) continue;
    const outputPath = path.join(outputDir, `${sanitizeFileName(item.name)}${extFromUrl(item.link, ".png")}`);
    await downloadFile(item.link, outputPath, fetchImpl);
    saved.push(outputPath);
    process.stdout.write(`Saved ${item.name} to ${outputPath}\n`);
  }

  return saved;
}

async function readJsonFile<T>(inputPath: string): Promise<T> {
  const content = await fs.readFile(inputPath, "utf8");
  return JSON.parse(content) as T;
}

export function buildProgram() {
  const program = new Command();

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
      await writeConfig({
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
      });
      process.stdout.write(`Saved config to ${getConfigPath()}\n`);
    });

  program
    .command("logout")
    .description("Remove the local Snapshot Site CLI config")
    .action(async () => {
      await clearConfig();
      process.stdout.write(`Removed config from ${getConfigPath()}\n`);
    });

  program
    .command("whoami-config")
    .description("Show the current CLI config path and whether credentials are configured")
    .action(async () => {
      const config = await readConfig();
      const payload = {
        path: getConfigPath(),
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
      const payload: ScreenshotRequest = {
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
      const payload: AnalyzeRequest = {
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

      const payload: VisualDiffRequest = options.input
        ? await readJsonFile<VisualDiffRequest>(options.input)
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
      await saveCompareAssets(
        [
          { name: "before", link: result.before?.link },
          { name: "after", link: result.after?.link },
          { name: "diff", link: result.diff?.link },
        ],
        options.saveImage
      );
    });

  return program;
}

export async function run(argv = process.argv) {
  await buildProgram().parseAsync(argv);
}

if (require.main === module) {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown CLI error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
