#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 检查测试环境...\n');

// 检查必要的文件
const requiredFiles = [
  'package.json',
  'jest.config.js',
  'jest.setup.js',
  'src/__tests__/hooks/usePermissionData.test.ts',
  'src/__tests__/components/PermissionMatrix.test.tsx',
  'src/__tests__/components/ApproverSelect.test.tsx',
  'src/__tests__/components/ModuleApproverEditor.test.tsx',
  'src/hooks/usePermissionData.ts',
  'src/components/ui/PermissionMatrix.tsx',
  'src/components/ui/ApproverSelect.tsx',
  'src/components/ui/ModuleApproverEditor.tsx'
];

let allFilesExist = true;

console.log('📁 检查文件是否存在:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📦 检查 package.json 中的测试依赖:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const devDependencies = packageJson.devDependencies || {};
  
  const requiredDeps = [
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@types/jest',
    'jest',
    'jest-environment-jsdom'
  ];
  
  requiredDeps.forEach(dep => {
    const hasDep = devDependencies[dep];
    console.log(`  ${hasDep ? '✅' : '❌'} ${dep}`);
    if (!hasDep) allFilesExist = false;
  });
  
  console.log('\n📋 检查测试脚本:');
  const scripts = packageJson.scripts || {};
  const requiredScripts = ['test', 'test:coverage', 'test:watch'];
  
  requiredScripts.forEach(script => {
    const hasScript = scripts[script];
    console.log(`  ${hasScript ? '✅' : '❌'} ${script}`);
    if (!hasScript) allFilesExist = false;
  });
  
} catch (error) {
  console.log('❌ 无法读取 package.json');
  allFilesExist = false;
}

console.log('\n🔧 检查 node_modules:');
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`  ${nodeModulesExists ? '✅' : '❌'} node_modules 目录`);

if (!nodeModulesExists) {
  console.log('\n💡 建议运行: npm install');
}

console.log('\n📊 总结:');
if (allFilesExist && nodeModulesExists) {
  console.log('✅ 测试环境配置正确！可以运行测试了。');
  console.log('\n🚀 运行命令:');
  console.log('  npm test                    # 运行所有测试');
  console.log('  npm run test:coverage      # 运行测试并查看覆盖率');
  console.log('  npm run test:watch         # 监听模式运行测试');
} else {
  console.log('❌ 测试环境配置有问题，请检查上述错误。');
  console.log('\n🔧 修复步骤:');
  console.log('1. 运行 npm install 安装依赖');
  console.log('2. 检查缺失的文件');
  console.log('3. 确保所有组件都正确导出');
} 