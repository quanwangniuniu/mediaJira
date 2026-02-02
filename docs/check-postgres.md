# 检查 PostgreSQL 连接（开发环境）

`docker-compose.dev.yml` 不包含 postgres 服务，后端通过 `DB_HOST=host.docker.internal` 连接**本机**的 5432 端口。

## 1. 确认本机 5432 是否有 PostgreSQL

**PowerShell：**
```powershell
# 看 5432 是否在监听
netstat -an | findstr 5432
# 或
Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
```

若没有输出，说明本机没有进程监听 5432，需要先启动 PostgreSQL。

**启动方式二选一：**

- **方式 A：用项目里的 postgres 容器（推荐）**  
  在项目根目录执行（`db` 在 `ci` profile 下，需加 `--profile ci`）：
  ```powershell
  docker compose -f docker-compose.yml --profile ci up -d db
  ```
  启动前确保 `.env` 里已设置 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_PORT`。  
  这会启动 postgres（容器名 `db`），并把 5432 映射到本机，后端用 `host.docker.internal:5432` 即可连到该容器。

- **方式 B：本机已安装 PostgreSQL**  
  确保服务已启动，且监听 0.0.0.0 或 127.0.0.1 的 5432，且允许本地连接。

## 2. 确认 .env 与 compose 里的数据库配置一致

`.env` 里是：
- `DB_HOST=postgres`  
- `POSTGRES_DB=mediajira_db`、`POSTGRES_USER=mediajira_user`、`POSTGRES_PASSWORD=jared520`、`POSTGRES_PORT=5432`

`docker-compose.dev.yml` 里后端被**覆盖**为：
- `DB_HOST=host.docker.internal`（连本机 5432）

因此：
- 若用**方式 A**（`docker compose -f docker-compose.yml up -d db`），请保证 `docker-compose.yml` 里 postgres 的 `POSTGRES_*` 与 `.env` 一致（或与下面检查命令里用的库名/用户/密码一致）。
- 若用本机 PostgreSQL（方式 B），请保证本机上有库 `mediajira_db`、用户 `mediajira_user`、密码 `jared520`。

## 3. 在 backend 容器里测试数据库连接

后端容器名是 `backend-dev`（dev compose）。在项目根目录执行：

```powershell
# 进入后端容器
docker exec -it backend-dev bash

# 在容器内用 Django 检查配置和数据库连接
python manage.py check

# 可选：用 Python 直接测 PostgreSQL
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.db import connection
connection.ensure_connection()
print('DB OK:', connection.settings_dict['NAME'])
"
```

若 `python manage.py check` 报错或上述脚本报错，把完整报错贴出来即可继续排查。

## 4. 若数据库是新建的，需要执行迁移

```powershell
docker exec -it backend-dev python manage.py migrate
```

## 5. 小结

| 检查项           | 命令/说明 |
|------------------|-----------|
| 本机 5432 是否在监听 | `netstat -an \| findstr 5432` 或 `Get-NetTCPConnection -LocalPort 5432` |
| 启动 postgres 容器 | `docker compose -f docker-compose.yml up -d db` |
| Django 配置+DB 连接 | `docker exec -it backend-dev python manage.py check` |
| 执行迁移         | `docker exec -it backend-dev python manage.py migrate` |

若 500 仍出现，请执行 `docker compose -f docker-compose.dev.yml logs backend --tail=80` 并把后端日志里的报错贴出来。
