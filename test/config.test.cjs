const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("config helpers round-trip login state", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "snapshot-site-home-"));
  process.env.HOME = tempHome;

  const { writeConfig, readConfig, clearConfig, getConfigPath } = require("../build/config.js");

  await writeConfig({ apiKey: "abc123", baseUrl: "https://api.example.com" });
  const config = await readConfig();

  assert.equal(config.apiKey, "abc123");
  assert.equal(config.baseUrl, "https://api.example.com");

  await clearConfig();
  await assert.rejects(fs.access(getConfigPath()));
});
