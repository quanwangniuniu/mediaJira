FROM node:18
WORKDIR /app

# 创建用户
RUN adduser --disabled-password --gecos "" --home /home/appuser appuser

# 复制 package.json
COPY package*.json ./

# 用 root 安装依赖到 /app/node_modules
RUN npm install

# 复制源码
COPY . .

# 修复权限，让 appuser 拥有 /app 和 node_modules
RUN chown -R appuser:appuser /app

# 切换到非 root 用户
USER appuser

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "dev"]
