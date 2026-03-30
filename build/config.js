"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigDir = getConfigDir;
exports.getConfigPath = getConfigPath;
exports.readConfig = readConfig;
exports.writeConfig = writeConfig;
exports.clearConfig = clearConfig;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
function getConfigDir() {
    return node_path_1.default.join(node_os_1.default.homedir(), ".config", "snapshot-site");
}
function getConfigPath() {
    return node_path_1.default.join(getConfigDir(), "config.json");
}
async function readConfig() {
    try {
        const content = await promises_1.default.readFile(getConfigPath(), "utf8");
        return JSON.parse(content);
    }
    catch (error) {
        const code = error.code;
        if (code === "ENOENT") {
            return {};
        }
        throw error;
    }
}
async function writeConfig(config) {
    await promises_1.default.mkdir(getConfigDir(), { recursive: true });
    await promises_1.default.writeFile(getConfigPath(), JSON.stringify(config, null, 2), "utf8");
}
async function clearConfig() {
    try {
        await promises_1.default.unlink(getConfigPath());
    }
    catch (error) {
        const code = error.code;
        if (code !== "ENOENT") {
            throw error;
        }
    }
}
