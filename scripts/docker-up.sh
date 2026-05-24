#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP_ENV="${APP_ENV:-staging}"
export APP_ENV
ENV_FILE="${1:-$ROOT_DIR/.env.$APP_ENV}"
COMPOSE_PARALLELISM="${COMPOSE_PARALLELISM:-4}"
COMPOSE_CMD="docker compose --parallel $COMPOSE_PARALLELISM --env-file $ENV_FILE"
CR="$(printf '\r')"

case "$APP_ENV" in
    staging|production) ;;
    *)
        echo "不支持的 APP_ENV: $APP_ENV"
        echo "Docker 一键部署只支持 staging 或 production"
        exit 1
        ;;
esac

if [ ! -f "$ENV_FILE" ]; then
    echo "未找到环境文件: $ENV_FILE"
    echo "请先基于 $ROOT_DIR/.env.example 创建 .env.$APP_ENV"
    exit 1
fi

load_env_file() {
    while IFS= read -r raw_line || [ -n "$raw_line" ]; do
        line="${raw_line%"$CR"}"

        case "$line" in
            ''|'#'*) continue ;;
            export\ *) line="${line#export }" ;;
        esac

        case "$line" in
            *=*) ;;
            *) continue ;;
        esac

        key="${line%%=*}"
        value="${line#*=}"

        if env | grep -q "^${key}="; then
            continue
        fi

        case "$value" in
            \"*\") value="${value#\"}"; value="${value%\"}" ;;
            \'*\') value="${value#\'}"; value="${value%\'}" ;;
        esac

        export "$key=$value"
    done < "$ENV_FILE"
}

load_env_file

cd "$ROOT_DIR"

wait_for_service() {
    service="$1"
    timeout="${2:-180}"
    elapsed=0

    while [ "$elapsed" -lt "$timeout" ]; do
        container_id="$($COMPOSE_CMD ps -a -q "$service")"

        if [ -n "$container_id" ]; then
            status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"

            if [ "$status" = "healthy" ] || [ "$status" = "running" ]; then
                echo "[$service] 已就绪 ($status)"
                return 0
            fi

            if [ "$status" = "unhealthy" ] || [ "$status" = "exited" ]; then
                echo "[$service] 启动失败，当前状态: $status"
                $COMPOSE_CMD logs --tail=200 "$service" || true
                exit 1
            fi
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo "[$service] 等待超时"
    $COMPOSE_CMD logs --tail=200 "$service" || true
    exit 1
}

wait_for_job_success() {
    service="$1"
    timeout="${2:-180}"
    elapsed=0

    while [ "$elapsed" -lt "$timeout" ]; do
        container_id="$($COMPOSE_CMD ps -a -q "$service")"

        if [ -n "$container_id" ]; then
            status="$(docker inspect --format '{{.State.Status}}' "$container_id")"

            if [ "$status" = "exited" ]; then
                exit_code="$(docker inspect --format '{{.State.ExitCode}}' "$container_id")"

                if [ "$exit_code" = "0" ]; then
                    echo "[$service] 已完成"
                    return 0
                fi

                echo "[$service] 执行失败，退出码: $exit_code"
                $COMPOSE_CMD logs --tail=200 "$service" || true
                exit 1
            fi
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo "[$service] 执行超时"
    $COMPOSE_CMD logs --tail=200 "$service" || true
    exit 1
}

require_env() {
    name="$1"
    value="$(printenv "$name" 2>/dev/null || true)"

    if [ -z "$value" ]; then
        echo "缺少必填环境变量: $name"
        if [ "$name" = "MEILI_ADMIN_KEY" ] || [ "$name" = "MEILI_SEARCH_KEY" ]; then
            echo "请先启动 meilisearch 容器，并用 MEILI_MASTER_KEY 通过 /keys 接口获取对应 API key 后写回 $ENV_FILE。"
        else
            echo "请在 $ENV_FILE 中显式配置后再执行一键部署。"
        fi
        exit 1
    fi
}

has_env() {
    name="$1"
    value="$(printenv "$name" 2>/dev/null || true)"
    [ -n "$value" ]
}

resolve_meili_mode() {
    if has_env MEILI_URL || has_env MEILI_ADMIN_KEY || has_env MEILI_SEARCH_KEY; then
        if has_env MEILI_URL && has_env MEILI_ADMIN_KEY && has_env MEILI_SEARCH_KEY; then
            MEILI_MODE="external"
            return 0
        fi

        echo "检测到不完整的外部 MeiliSearch 配置，本次将跳过搜索能力。"
        MEILI_MODE="disabled"
        return 0
    fi

    if has_env MEILI_MASTER_KEY && has_env MEILI_ADMIN_KEY && has_env MEILI_SEARCH_KEY; then
        MEILI_MODE="internal"
        return 0
    fi

    if has_env MEILI_MASTER_KEY || has_env MEILI_ADMIN_KEY || has_env MEILI_SEARCH_KEY; then
        echo "检测到不完整的内置 MeiliSearch 配置，本次将跳过搜索能力。"
        MEILI_MODE="disabled"
        return 0
    fi

    MEILI_MODE="disabled"
}

require_env JWT_SECRET
require_env DATABASE_URL
require_env BLOG_PUBLIC_URL
require_env ADMIN_PUBLIC_URL
require_env API_PUBLIC_URL

if ! has_env BLOG_BUILD_DATABASE_URL; then
    export BLOG_BUILD_DATABASE_URL="$DATABASE_URL"
fi

MEILI_MODE=""
resolve_meili_mode

case "$MEILI_MODE" in
    internal)
        export MEILI_URL="http://meilisearch:7700"
        ;;
    external)
        ;;
    disabled)
        export MEILI_URL=""
        export MEILI_ADMIN_KEY=""
        export MEILI_SEARCH_KEY=""
        ;;
esac

echo "当前部署环境: $APP_ENV"
echo "1/4 启动基础设施容器"
$COMPOSE_CMD up -d mysql redis

if [ "$MEILI_MODE" = "internal" ]; then
    $COMPOSE_CMD up -d meilisearch
fi

wait_for_service mysql
wait_for_service redis

if [ "$MEILI_MODE" = "internal" ]; then
    wait_for_service meilisearch
fi

echo "2/4 执行服务端初始化 job"
$COMPOSE_CMD rm -sf admin-server-migrate admin-server-seed admin-search-init >/dev/null 2>&1 || true
$COMPOSE_CMD up -d --build admin-server-migrate admin-server-seed

wait_for_job_success admin-server-migrate
wait_for_job_success admin-server-seed

if [ "$MEILI_MODE" != "disabled" ]; then
    $COMPOSE_CMD up -d --build admin-search-init
    wait_for_job_success admin-search-init
fi

echo "3/4 构建并启动三端服务"
$COMPOSE_CMD build --build-arg BLOG_BUILD_CACHE_BUSTER="$(date -u +%Y%m%d%H%M%S)" admin-server admin-metrics-worker admin-client blog
$COMPOSE_CMD up -d --no-deps admin-server admin-metrics-worker

wait_for_service admin-server

$COMPOSE_CMD up -d --no-deps admin-client blog

wait_for_service admin-client
wait_for_service blog

echo "4/4 当前服务状态"
$COMPOSE_CMD ps

case "$MEILI_MODE" in
    internal)
        echo "搜索服务: 使用 Docker 内置 MeiliSearch"
        ;;
    external)
        echo "搜索服务: 使用外部 MeiliSearch (${MEILI_URL})"
        ;;
    disabled)
        echo "搜索服务: 未启用（已跳过 MeiliSearch 容器与索引初始化）"
        ;;
esac

echo "访问地址:"
echo "- blog:  ${BLOG_PUBLIC_URL:-http://localhost:3000}"
echo "- admin: ${ADMIN_PUBLIC_URL:-http://localhost:8080}"
echo "- api:   ${API_PUBLIC_URL:-http://localhost:8000}"
