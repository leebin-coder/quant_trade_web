# Docker 部署指南

## 文件说明

项目已经配置好 Docker 部署，包含以下文件：

- `Dockerfile` - 前端应用的 Docker 镜像配置（多阶段构建）
- `nginx.conf` - Nginx 服务器配置，包含路由和 API 代理
- `.dockerignore` - Docker 构建时忽略的文件
- `docker-compose.yml` - Docker Compose 编排配置

## 构建方式

### 方式一：使用 Docker 单独构建前端

```bash
# 构建镜像
docker build -t quant_trade_web:latest .

# 运行容器（需要确保后端服务在 localhost:8080 可访问）
docker run -d -p 80:80 --name quant_web quant_trade_web:latest
```

访问地址：http://localhost

### 方式二：使用 Docker Compose（推荐）

如果你的后端也需要 Docker 化，请先编辑 `docker-compose.yml` 文件中的 `backend` 服务配置。

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

访问地址：http://localhost

## 注意事项

### 1. 后端服务配置

`nginx.conf` 中配置了以下 API 代理：
- `/api/` -> `http://backend:8080`
- `/auth/` -> `http://backend:8080`
- `/user/` -> `http://backend:8080`

如果你的后端不在 Docker 中运行，需要修改 `nginx.conf` 中的 `proxy_pass` 地址。

例如，如果后端在宿主机运行：
```nginx
proxy_pass http://host.docker.internal:8080;
```

### 2. 端口配置

- 前端默认端口：80
- 后端默认端口：8080

如需修改，请编辑 `docker-compose.yml` 中的 `ports` 配置。

### 3. 环境变量

如果需要配置环境变量（如 API 地址），可以：

1. 在 `docker-compose.yml` 中添加环境变量：
```yaml
environment:
  - VITE_API_URL=http://your-api-url
```

2. 或者使用 `.env` 文件（需要在 Dockerfile 中配置 build args）

## 生产环境部署建议

1. 使用 HTTPS（配置 SSL 证书）
2. 配置 Nginx 安全头部
3. 设置资源限制（CPU、内存）
4. 配置日志收集
5. 使用镜像仓库管理镜像版本
6. 配置健康检查

## 常用命令

```bash
# 查看运行中的容器
docker ps

# 查看镜像
docker images

# 进入容器查看日志
docker exec -it quant_web sh

# 查看 Nginx 配置是否正确
docker exec quant_web nginx -t

# 重启 Nginx
docker exec quant_web nginx -s reload

# 清理未使用的镜像和容器
docker system prune -a
```

## 故障排查

1. 如果前端无法访问后端 API：
   - 检查 `nginx.conf` 中的代理配置
   - 确保后端服务正常运行
   - 检查网络连接（如果使用 Docker Compose，确保在同一网络）

2. 如果页面 404：
   - 检查 `nginx.conf` 中的 `try_files` 配置
   - 确保构建产物在 `/usr/share/nginx/html`

3. 如果构建失败：
   - 检查 Node.js 版本是否兼容
   - 确保 `package.json` 中的依赖正确
   - 查看构建日志排查具体错误
