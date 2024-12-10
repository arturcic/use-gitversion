import * as path from 'path';
import { S as SettingsProvider, D as DotnetTool, R as RunnerBase } from './tools.mjs';
import 'node:crypto';
import 'node:fs/promises';
import 'node:os';
import 'node:path';
import './semver.mjs';

class GitReleaseManagerSettingsProvider extends SettingsProvider {
  getCreateSettings() {
    const name = this.buildAgent.getInput("name");
    const inputFileName = this.buildAgent.getInput("inputFileName");
    const isPreRelease = this.buildAgent.getBooleanInput("isPreRelease");
    const commit = this.buildAgent.getInput("commit");
    const assets = this.buildAgent.getListInput("assets");
    const commonSettings = this.getCommonSettings();
    return {
      ...commonSettings,
      name,
      inputFileName,
      isPreRelease,
      commit,
      assets
    };
  }
  getDiscardSettings() {
    const commonSettings = this.getCommonSettings();
    return {
      ...commonSettings
    };
  }
  getCloseSettings() {
    const commonSettings = this.getCommonSettings();
    return {
      ...commonSettings
    };
  }
  getOpenSettings() {
    const commonSettings = this.getCommonSettings();
    return {
      ...commonSettings
    };
  }
  getPublishSettings() {
    const commonSettings = this.getCommonSettings();
    return {
      ...commonSettings
    };
  }
  getAddAssetSettings() {
    const assets = this.buildAgent.getListInput("assets");
    const commonSettings = this.getCommonSettings();
    return {
      ...commonSettings,
      assets
    };
  }
  getCommonSettings() {
    const milestone = this.buildAgent.getInput("milestone");
    const owner = this.buildAgent.getInput("owner");
    const repository = this.buildAgent.getInput("repository");
    const token = this.buildAgent.getInput("token");
    const targetDirectory = this.buildAgent.getInput("targetDirectory");
    const logFilePath = this.buildAgent.getInput("logFilePath");
    return {
      owner,
      repository,
      token,
      targetDirectory,
      milestone,
      logFilePath
    };
  }
}

class GitReleaseManagerTool extends DotnetTool {
  get packageName() {
    return "GitReleaseManager.Tool";
  }
  get toolName() {
    return "dotnet-gitreleasemanager";
  }
  get toolPathVariable() {
    return "GITRELEASEMANAGER_PATH";
  }
  get versionRange() {
    return ">=0.10.0 <0.20.0";
  }
  get settingsProvider() {
    return new GitReleaseManagerSettingsProvider(this.buildAgent);
  }
  async create() {
    const settings = this.settingsProvider.getCreateSettings();
    const args = await this.getCreateArguments(settings);
    return await this.executeTool(args);
  }
  async discard() {
    const settings = this.settingsProvider.getDiscardSettings();
    const args = await this.getDiscardArguments(settings);
    return await this.executeTool(args);
  }
  async close() {
    const settings = this.settingsProvider.getCloseSettings();
    const args = await this.getCloseArguments(settings);
    return await this.executeTool(args);
  }
  async open() {
    const settings = this.settingsProvider.getOpenSettings();
    const args = await this.getOpenArguments(settings);
    return await this.executeTool(args);
  }
  async publish() {
    const settings = this.settingsProvider.getPublishSettings();
    const args = await this.getPublishArguments(settings);
    return await this.executeTool(args);
  }
  async addAsset() {
    const settings = this.settingsProvider.getAddAssetSettings();
    const args = await this.getAddAssetArguments(settings);
    return await this.executeTool(args);
  }
  async getCommonArguments(settings) {
    const args = [];
    args.push("--owner", settings.owner);
    args.push("--repository", settings.repository);
    args.push("--token", settings.token);
    settings.targetDirectory = await this.getRepoDir(settings);
    args.push("--targetDirectory", settings.targetDirectory);
    if (settings.logFilePath) {
      args.push("--logFilePath", settings.logFilePath);
    }
    return args;
  }
  async getCreateArguments(settings) {
    const args = ["create", ...await this.getCommonArguments(settings)];
    if (settings.milestone) {
      args.push("--milestone", settings.milestone);
    }
    if (settings.name) {
      args.push("--name", settings.name);
    }
    if (settings.commit) {
      args.push("--targetcommitish", settings.commit);
    }
    if (settings.inputFileName) {
      if (await this.buildAgent.fileExists(settings.inputFileName)) {
        args.push("--inputFilePath", settings.inputFileName);
      } else {
        throw new Error(`GitReleaseManager inputFilePath not found at ${settings.inputFileName}`);
      }
    }
    if (settings.isPreRelease) {
      args.push("--pre");
    }
    if (settings.assets && settings.assets.length > 0) {
      settings.assets = settings.assets.map((asset) => {
        return path.join(settings.targetDirectory, asset);
      });
      args.push("--assets", settings.assets.join(","));
    }
    return args;
  }
  async getDiscardArguments(settings) {
    const args = ["discard", ...await this.getCommonArguments(settings)];
    if (settings.milestone) {
      args.push("--milestone", settings.milestone);
    }
    return args;
  }
  async getCloseArguments(settings) {
    const args = ["close", ...await this.getCommonArguments(settings)];
    if (settings.milestone) {
      args.push("--milestone", settings.milestone);
    }
    return args;
  }
  async getOpenArguments(settings) {
    const args = ["open", ...await this.getCommonArguments(settings)];
    if (settings.milestone) {
      args.push("--milestone", settings.milestone);
    }
    return args;
  }
  async getPublishArguments(settings) {
    const args = ["publish", ...await this.getCommonArguments(settings)];
    if (settings.milestone) {
      args.push("--tagName", settings.milestone);
    }
    return args;
  }
  async getAddAssetArguments(settings) {
    const args = ["addasset", ...await this.getCommonArguments(settings)];
    if (settings.milestone) {
      args.push("--tagName", settings.milestone);
    }
    if (settings.assets && settings.assets.length > 0) {
      settings.assets = settings.assets.map((asset) => {
        return path.join(settings.targetDirectory, asset);
      });
      args.push("--assets", settings.assets.join(","));
    }
    return args;
  }
  async getRepoDir(settings) {
    return await this.getRepoPath(settings.targetDirectory);
  }
}

class Runner extends RunnerBase {
  constructor(buildAgent) {
    super(buildAgent);
    this.buildAgent = buildAgent;
    this.tool = new GitReleaseManagerTool(this.buildAgent);
  }
  tool;
  async run(command) {
    switch (command) {
      case "setup":
        return await this.setup();
      case "addasset":
        return await this.addAsset();
      case "open":
        return await this.open();
      case "close":
        return await this.close();
      case "create":
        return await this.create();
      case "discard":
        return await this.discard();
      case "publish":
        return await this.publish();
    }
  }
  async setup() {
    return this.safeExecute(async () => {
      await this.tool.install();
      return { code: 0 };
    }, "GitReleaseManager setup successfully");
  }
  async create() {
    return this.safeExecute(async () => await this.tool.create(), "GitReleaseManager created release successfully");
  }
  async discard() {
    return this.safeExecute(async () => await this.tool.discard(), "GitReleaseManager discarded release successfully");
  }
  async close() {
    return this.safeExecute(async () => await this.tool.close(), "GitReleaseManager closed release successfully");
  }
  async open() {
    return this.safeExecute(async () => await this.tool.open(), "GitReleaseManager opened release successfully");
  }
  async publish() {
    return this.safeExecute(async () => await this.tool.publish(), "GitReleaseManager published release successfully");
  }
  async addAsset() {
    return this.safeExecute(async () => await this.tool.addAsset(), "GitReleaseManager added assets to release successfully");
  }
}

export { Runner };
//# sourceMappingURL=gitreleasemanager.mjs.map
