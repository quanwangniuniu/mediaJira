#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking test environment...\n');

// Check required files
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

console.log('📁 Checking if files exist:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📦 Checking test dependencies in package.json:');
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
  
  console.log('\n📋 Checking test scripts:');
  const scripts = packageJson.scripts || {};
  const requiredScripts = ['test', 'test:coverage', 'test:watch'];
  
  requiredScripts.forEach(script => {
    const hasScript = scripts[script];
    console.log(`  ${hasScript ? '✅' : '❌'} ${script}`);
    if (!hasScript) allFilesExist = false;
  });
  
} catch (error) {
  console.log('❌ Cannot read package.json');
  allFilesExist = false;
}

console.log('\n🔧 Checking node_modules:');
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`  ${nodeModulesExists ? '✅' : '❌'} node_modules directory`);

if (!nodeModulesExists) {
  console.log('\n💡 Suggested: run npm install');
}

console.log('\n📊 Summary:');
if (allFilesExist && nodeModulesExists) {
  console.log('✅ Test environment configured correctly! Ready to run tests.');
  console.log('\n🚀 Run commands:');
  console.log('  npm test                    # Run all tests');
  console.log('  npm run test:coverage      # Run tests with coverage');
  console.log('  npm run test:watch         # Run tests in watch mode');
} else {
  console.log('❌ Test environment has issues, please check errors above.');
  console.log('\n🔧 Fix steps:');
  console.log('1. Run npm install to install dependencies');
  console.log('2. Check missing files');
  console.log('3. Ensure all components are exported correctly');
} 