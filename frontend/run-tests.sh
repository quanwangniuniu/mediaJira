#!/bin/bash

echo "🧪 开始运行权限 UI 组件单元测试..."
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在 frontend 目录下运行此脚本"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "🔍 运行所有测试..."
npm test

echo ""
echo "📊 运行覆盖率测试..."
npm run test:coverage

echo ""
echo "✅ 测试完成！"
echo ""
echo "📋 测试结果说明："
echo "- 绿色 PASS = 测试通过"
echo "- 红色 FAIL = 测试失败"
echo "- 覆盖率 ≥ 85% = 符合要求"
echo ""
echo "🔧 如果测试失败，请检查："
echo "1. 所有依赖是否正确安装"
echo "2. TypeScript 类型是否正确"
echo "3. 组件是否正确导出"
echo "4. Mock 数据是否正确" 