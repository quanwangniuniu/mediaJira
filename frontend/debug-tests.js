#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 调试测试问题...\n');

try {
  // 运行单个测试文件来检查问题
  console.log('📋 运行 PermissionMatrix 测试...');
  execSync('npm test -- PermissionMatrix.test.tsx --verbose', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.log('\n❌ 测试失败，错误信息：');
  console.log(error.message);
  
  console.log('\n🔧 建议的修复步骤：');
  console.log('1. 检查组件是否正确导出');
  console.log('2. 检查 Mock 数据是否正确');
  console.log('3. 检查测试期望是否与实际组件行为匹配');
  console.log('4. 确保所有依赖都已安装');
  
  console.log('\n📝 常见问题：');
  console.log('- 组件没有正确导出 (export default)');
  console.log('- Mock 函数没有正确设置');
  console.log('- 测试期望的 DOM 结构与实际不符');
  console.log('- TypeScript 类型错误');
} 