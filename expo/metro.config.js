const path = require('path');
const { getDefaultConfig } = require("expo/metro-config");

let withRorkMetro;
try {
  withRorkMetro = require("@rork-ai/toolkit-sdk/metro").withRorkMetro;
} catch {
  withRorkMetro = (config) => config;
}

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

module.exports = withRorkMetro(config);
