#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Debugging test issues...\n');

try {
  // Run single test file to check issues
  console.log('📋 Running PermissionMatrix tests...');
  execSync('npm test -- PermissionMatrix.test.tsx --verbose', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.log('\n❌ Test failed, error message:');
  console.log(error.message);
  
  console.log('\n🔧 Suggested fix steps:');
  console.log('1. Check if component is exported correctly');
  console.log('2. Check if Mock data is correct');
  console.log('3. Check if test expectations match actual component behavior');
  console.log('4. Ensure all dependencies are installed');
  
  console.log('\n📝 Common issues:');
  console.log('- Component not exported correctly (export default)');
  console.log('- Mock functions not set up correctly');
  console.log('- Test expected DOM structure doesn\'t match actual');
  console.log('- TypeScript type errors');
} 