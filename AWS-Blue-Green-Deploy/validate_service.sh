#!/bin/bash
# 循环检查 Django 容器是否真正 Ready
for i in {1..10}
do
  # 假设你的 Django 运行在 8000 端口，并有 /health/ 接口
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health/)
  if [ "$HTTP_CODE" == "200" ]; then
    echo "Health check passed!"
    exit 0
  fi
  echo "Waiting for service... (attempt $i)"
  sleep 10
done

# 如果 100 秒后还没 Ready，强制退出，CodeDeploy 会判定部署失败并自动回滚
echo "Health check failed!"
exit 1