const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { saveScreenshotAsset, saveCompareAssets, buildProgram } = require("../build/cli.js");

test("cli exposes screenshot, analyze, and compare commands", () => {
  const program = buildProgram();
  const commandNames = program.commands.map((command) => command.name());
  assert.deepEqual(commandNames, ["login", "logout", "whoami-config", "screenshot", "analyze", "compare"]);
});

test("saveScreenshotAsset downloads a single file", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "snapshot-site-cli-"));
  const outputPath = path.join(tempDir, "shot.png");

  await saveScreenshotAsset(
    "https://cdn.snapshot-site.fr/screenshots/example.png",
    outputPath,
    async () => ({
      ok: true,
      arrayBuffer: async () => Buffer.from("image-bytes"),
    })
  );

  const content = await fs.readFile(outputPath, "utf8");
  assert.equal(content, "image-bytes");
});

test("saveCompareAssets downloads before, after, and diff into a directory", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "snapshot-site-compare-"));

  const saved = await saveCompareAssets(
    [
      { name: "before", link: "https://cdn.snapshot-site.fr/before.png" },
      { name: "after", link: "https://cdn.snapshot-site.fr/after.png" },
      { name: "diff", link: "https://cdn.snapshot-site.fr/diff.png" },
    ],
    tempDir,
    async (url) => ({
      ok: true,
      arrayBuffer: async () => Buffer.from(`download:${url}`),
    })
  );

  assert.equal(saved.length, 3);
  const firstContent = await fs.readFile(saved[0], "utf8");
  assert.ok(firstContent.includes("before.png"));
});
