// Expo + pnpm monorepo metro 설정
// - watchFolders: 워크스페이스 루트까지 감시 → packages/* 변경 즉시 반영
// - nodeModulesPaths: 두 위치 모두 검색 (hoist 된 것 + 로컬)
// - disableHierarchicalLookup: 비결정적 경로 탐색 차단
// - withNativeWind: NativeWind v4 transformer 래핑

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
