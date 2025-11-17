#!/usr/bin/env bash

# -----------------------------------------------------------------------------
# ColorWerkz Universal Setup Script
# -----------------------------------------------------------------------------
# Purpose:
#   1. Perform system prerequisite checks (Node, Python, PostgreSQL, Git, GPU libs).
#   2. Scaffold the ColorWerkz monorepo directory structure (idempotent).
#   3. Emit a machine-readable environment report (JSON) and human summary.
#
# Philosophy (Knuth + Wolfram):
#   This script is a literate, executable specification. It treats the environment
#   as a computational state and transitions it toward the desired repository structure.
# -----------------------------------------------------------------------------

set -euo pipefail
IFS=$'\n\t'

SCRIPT_NAME="$(basename "$0")"
START_TIME=$(date +%s)

# ------------------------------ Defaults -------------------------------------
CHECK_ONLY=false
STRUCTURE_ONLY=false
DRY_RUN=false
FORCE=false
PYTHON_BIN="python3"
PKG_MANAGER="auto" # auto-detect among pnpm,yarn,npm
REPORT_FILE="setup_environment_report.json"
ROOT_DIR="$(pwd)"
VENV_PATH="services/ai-service/.venv"
CREATE_VENV=true
VENV_CREATED=false
NODE_INSTALL=true
DB_INIT=false
ENV_EXAMPLE=false
DB_CHECK=false

# --------------------------- Color Output ------------------------------------
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; CYAN=""; BOLD=""; RESET=""
fi

log() { printf "%s\n" "$*"; }
info() { log "${BLUE}[INFO]${RESET} $*"; }
warn() { log "${YELLOW}[WARN]${RESET} $*"; }
error() { log "${RED}[ERROR]${RESET} $*" >&2; }
ok() { log "${GREEN}[OK]${RESET} $*"; }

die() { error "$1"; exit 1; }

usage() {
  cat <<EOF
${BOLD}ColorWerkz Universal Setup${RESET}

Usage: ./$SCRIPT_NAME [options]

Options:
  --check-only            Only run environment checks (no dirs created)
  --structure-only        Only create directory structure (skip dependency checks)
  --dry-run               Show what would be done without modifying filesystem
  --force                 Proceed even if warnings encountered
  --python-bin <path>     Python interpreter to use (default: python3)
  --package-manager <pm>  Force package manager (npm|pnpm|yarn|auto)
  --root <path>           Root path to scaffold (default: current directory)
  --report <file>         JSON report output file (default: setup_environment_report.json)
  --venv <path>           Virtual environment path (default: services/ai-service/.venv)
  --no-venv               Skip virtual environment creation & Python deps install
  --no-node-install       Skip Node dependency installation (apps/web, apps/api)
  --db-init               Create database scaffold (drizzle config + migration script)
  --env-example           Generate a root .env.example with common settings
  --db-check              Attempt to connect to DATABASE_URL with psql and run SELECT 1
  --help                  Show this help

Examples:
  ./$SCRIPT_NAME --check-only
  ./$SCRIPT_NAME --dry-run --package-manager pnpm
  ./$SCRIPT_NAME --python-bin /usr/local/bin/python3.11
EOF
}

# ------------------------ Argument Parsing -----------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --check-only) CHECK_ONLY=true ; shift ;;
    --structure-only) STRUCTURE_ONLY=true ; shift ;;
    --dry-run) DRY_RUN=true ; shift ;;
    --force) FORCE=true ; shift ;;
    --python-bin) PYTHON_BIN="$2" ; shift 2 ;;
    --package-manager) PKG_MANAGER="$2" ; shift 2 ;;
    --root) ROOT_DIR="$2" ; shift 2 ;;
    --report) REPORT_FILE="$2" ; shift 2 ;;
    --venv) VENV_PATH="$2" ; shift 2 ;;
    --no-venv) CREATE_VENV=false ; shift ;;
    --no-node-install) NODE_INSTALL=false ; shift ;;
    --db-init) DB_INIT=true ; shift ;;
    --env-example) ENV_EXAMPLE=true ; shift ;;
    --db-check) DB_CHECK=true ; shift ;;
    --help) usage; exit 0 ;;
    *) error "Unknown option: $1"; usage; exit 1 ;;
  esac
done

# Safety: mutually exclusive modes
if $CHECK_ONLY && $STRUCTURE_ONLY; then
  die "Cannot use --check-only and --structure-only together."
fi

# ---------------------- Environment Checks -----------------------------------
FOUND_NODE=""; NODE_VERSION=""; NODE_OK=false
FOUND_PYTHON=""; PY_VERSION=""; PY_OK=false
FOUND_PSQL=""; PSQL_VERSION=""; PSQL_OK=false
FOUND_GIT=""; GIT_VERSION=""; GIT_OK=false
PKG_MANAGER_RESOLVED=""; PKG_MANAGER_OK=false
PY_PKGS=(torch cv2 numpy)
MISSING_PY_PKGS=()
GPU_CAPABLE=false

check_node() {
  if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version 2>/dev/null || true)
    FOUND_NODE=$(command -v node)
    # Strip leading 'v'
    local ver=${NODE_VERSION#v}
    local major=${ver%%.*}
    if [ "$major" -ge 18 ]; then NODE_OK=true; fi
  fi
}

detect_pkg_manager() {
  if [ "$PKG_MANAGER" != "auto" ]; then
    PKG_MANAGER_RESOLVED="$PKG_MANAGER"
    command -v "$PKG_MANAGER_RESOLVED" >/dev/null 2>&1 && PKG_MANAGER_OK=true || PKG_MANAGER_OK=false
    return
  fi
  for pm in pnpm yarn npm; do
    if command -v "$pm" >/dev/null 2>&1; then PKG_MANAGER_RESOLVED="$pm"; PKG_MANAGER_OK=true; return; fi
  done
  PKG_MANAGER_RESOLVED="npm"
}

check_python() {
  if command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    FOUND_PYTHON=$(command -v "$PYTHON_BIN")
    PY_VERSION=$($PYTHON_BIN -c 'import sys; print("%d.%d.%d"%sys.version_info[:3])')
    local major minor patch
    major=$(printf '%s' "$PY_VERSION" | cut -d. -f1)
    minor=$(printf '%s' "$PY_VERSION" | cut -d. -f2)
    if [ "$major" -ge 3 ] && [ "$minor" -ge 10 ]; then PY_OK=true; fi
    for pkg in "${PY_PKGS[@]}"; do
      if ! $PYTHON_BIN -c "import $pkg" 2>/dev/null; then MISSING_PY_PKGS+=("$pkg"); fi
    done
    # Rudimentary GPU capability detection
    if $PYTHON_BIN -c 'import torch; print(torch.cuda.is_available())' 2>/dev/null | grep -qi true; then GPU_CAPABLE=true; fi
  fi
}

check_psql() {
  if command -v psql >/dev/null 2>&1; then
    FOUND_PSQL=$(command -v psql)
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    PSQL_OK=true
  fi
}

check_git() {
  if command -v git >/dev/null 2>&1; then
    FOUND_GIT=$(command -v git)
    GIT_VERSION=$(git --version | awk '{print $3}')
    GIT_OK=true
  fi
}

system_checks() {
  info "Running system checks..."
  check_node
  detect_pkg_manager
  check_python
  check_psql
  check_git

  $NODE_OK && ok "Node.js: $NODE_VERSION ($FOUND_NODE)" || warn "Node.js (>=18) NOT OK"
  $PKG_MANAGER_OK && ok "Package Manager: $PKG_MANAGER_RESOLVED" || warn "Package manager not found; npm assumed after installation."
  $PY_OK && ok "Python: $PY_VERSION ($FOUND_PYTHON)" || warn "Python >=3.10 NOT OK"
  if [ ${#MISSING_PY_PKGS[@]} -gt 0 ]; then
    warn "Missing python packages: ${MISSING_PY_PKGS[*]}"; else ok "Python key packages present (torch, cv2, numpy)"; fi
  $PSQL_OK && ok "PostgreSQL client: $PSQL_VERSION ($FOUND_PSQL)" || warn "psql NOT found"
  $GIT_OK && ok "Git: $GIT_VERSION ($FOUND_GIT)" || warn "git NOT found"
  $GPU_CAPABLE && ok "GPU / CUDA available for PyTorch" || warn "CUDA not detected – CPU training only"
}

# ---------------------- Directory Structure ----------------------------------
DIRS=(
  ".github/workflows"
  "apps/web/public"
  "apps/web/src/components/atomic"
  "apps/web/src/components/features/color-combinator"
  "apps/web/src/components/features/model-trainer"
  "apps/web/src/components/layouts"
  "apps/web/src/components/ui"
  "apps/web/src/hooks"
  "apps/web/src/lib"
  "apps/web/src/pages"
  "apps/web/src/router"
  "apps/web/src/services"
  "apps/web/src/styles"
  "apps/api/src/config"
  "apps/api/src/lib"
  "apps/api/src/middleware"
  "apps/api/src/routes/v1"
  "apps/api/src/routes/v2"
  "apps/api/src/services"
  "docs/api-reference" "docs/getting-started" "docs/troubleshooting" "docs/user-guide"
  "packages/config/tsconfig" "packages/db/src/migrations" "packages/db/src/schema" "packages/ui/src"
  "scripts"
  "services/ai-service/app/core"
  "services/ai-service/app/models"
  "services/ai-service/app/processing"
  "services/ai-service/app/routers"
  "services/ai-service/data/processed"
  "services/ai-service/data/raw"
  "services/ai-service/models"
  "services/ai-service/notebooks"
  "services/ai-service/tests"
)

create_structure() {
  info "Scaffolding directory structure under: $ROOT_DIR"
  local created=0 skipped=0
  for d in "${DIRS[@]}"; do
    local target="$ROOT_DIR/$d"
    if [ -d "$target" ]; then
      skipped=$((skipped+1))
      continue
    fi
    if $DRY_RUN; then
      log "[DRY] mkdir -p $target"
    else
      mkdir -p "$target" || die "Failed to create $target"
      created=$((created+1))
      # Add .gitkeep to empty leaf dirs
      if [ -z "$(ls -A "$target" 2>/dev/null)" ]; then
        printf "\n" > "$target/.gitkeep"
      fi
    fi
  done
  ok "Directory creation complete (created=$created, skipped=$skipped)"
  create_placeholders
}

create_placeholders() {
  # Minimal sentinel files if missing
  local files=(
    "README.md"
    "apps/web/package.json"
    "apps/api/package.json"
    "services/ai-service/requirements.txt"
    "services/ai-service/app/main.py"
  )
  for f in "${files[@]}"; do
    local path="$ROOT_DIR/$f"
    if [ -f "$path" ]; then continue; fi
    if $DRY_RUN; then
      log "[DRY] create placeholder $path"
    else
      case "$f" in
        "README.md") cat > "$path" <<'RMD'
# ColorWerkz

Generated initial structure. Populate docs and code as tasks progress.
RMD
        ;;
        "apps/web/package.json") cat > "$path" <<'PKG'
{
  "name": "colorwerkz-web",
  "private": true,
  "version": "0.0.1",
  "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"}
}
PKG
        ;;
        "apps/api/package.json") cat > "$path" <<'PKG'
{
  "name": "colorwerkz-api",
  "private": true,
  "version": "0.0.1",
  "scripts": {"dev": "node src/server.ts"}
}
PKG
        ;;
        "services/ai-service/requirements.txt") cat > "$path" <<'REQ'
torch
opencv-python
numpy
fastapi
uvicorn
REQ
        ;;
        "services/ai-service/app/main.py") cat > "$path" <<'PY'
from fastapi import FastAPI

app = FastAPI(title="ColorWerkz AI Service")

@app.get("/health")
def health():
    return {"status": "ok"}
PY
        ;;
      esac
    fi
  done
}

# -------------------- Env Example & DB Connectivity ------------------------
create_env_example() {
  if ! $ENV_EXAMPLE; then return; fi
  local envfile="$ROOT_DIR/.env.example"
  if $DRY_RUN; then
    log "[DRY] create $envfile"
    return
  fi
  if [ -f "$envfile" ]; then
    warn ".env.example already exists; skipping"
    return
  fi
  cat > "$envfile" <<'ENV'
# Environment template for ColorWerkz
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/colorwerkz

# Services
AI_SERVICE_URL=http://127.0.0.1:8000

# Observability
REQUEST_ID_HEADER=X-Request-ID
LOG_LEVEL=info
ENV
  ok ".env.example written"
}

db_check_connectivity() {
  if ! $DB_CHECK; then return; fi
  info "Checking database connectivity via psql"
  if ! $PSQL_OK; then
    warn "psql not found; install PostgreSQL client (e.g., brew install postgresql@16)"
    return
  fi
  # Load DATABASE_URL from existing .env if present
  local dburl="${DATABASE_URL:-}"
  if [ -z "$dburl" ] && [ -f "$ROOT_DIR/.env" ]; then
    set -a; # export sourced vars
    # shellcheck disable=SC1090
    source "$ROOT_DIR/.env" || true
    set +a
    dburl="${DATABASE_URL:-}"
  fi
  if [ -z "$dburl" ]; then
    warn "DATABASE_URL not set in environment or .env; skipping connectivity test"
    return
  fi
  if $DRY_RUN; then
    log "[DRY] psql \"$dburl\" -Atc 'SELECT 1'"
    return
  fi
  if psql "$dburl" -Atc 'SELECT 1' >/dev/null 2>&1; then
    ok "Database connectivity OK"
  else
    warn "Failed to connect to database using DATABASE_URL"
  fi
}

# -------------------- Requirements & Virtual Env ----------------------------
ensure_requirements() {
  local req="$ROOT_DIR/services/ai-service/requirements.txt"
  local baseline=(torch opencv-python numpy fastapi uvicorn pillow scikit-image scikit-learn)
  if [ ! -f "$req" ]; then
    if $DRY_RUN; then
      log "[DRY] create $req with baseline deps"
    else
      printf "%s\n" "${baseline[@]}" | tr ' ' '\n' > "$req"
    fi
    return
  fi
  for dep in "${baseline[@]}"; do
    if ! grep -E "^${dep}(==|$)" "$req" >/dev/null 2>&1; then
      if $DRY_RUN; then
        log "[DRY] append $dep to $req"
      else
        echo "$dep" >> "$req"
      fi
    fi
  done
}

create_virtual_env() {
  if ! $CREATE_VENV; then info "Skipping virtual environment creation (--no-venv)"; return; fi
  if ! $PY_OK; then warn "Python not OK; skipping venv creation"; return; fi
  local target="$ROOT_DIR/$VENV_PATH"
  if $DRY_RUN; then
    log "[DRY] python -m venv $target"
    log "[DRY] would install requirements"
    return
  fi
  if [ ! -d "$target" ]; then
    $PYTHON_BIN -m venv "$target" || die "Failed to create venv at $target"
  fi
  # shellcheck disable=SC1090
  source "$target/bin/activate"
  ensure_requirements
  pip install --upgrade pip >/dev/null 2>&1 || warn "Could not upgrade pip"
  pip install -r "$ROOT_DIR/services/ai-service/requirements.txt" || die "pip install failed"
  deactivate || true
  VENV_CREATED=true
  ok "Virtual environment ready at $VENV_PATH"
}

# -------------------- Node Dependency Installation --------------------------
install_node_dependencies() {
  if ! $NODE_INSTALL; then info "Skipping Node dependency installation (--no-node-install)"; return; fi
  if ! $NODE_OK; then warn "Node not OK; skipping Node dependency installation"; return; fi
  for pkgDir in "apps/web" "apps/api"; do
    local dir="$ROOT_DIR/$pkgDir"
    if [ ! -f "$dir/package.json" ]; then warn "No package.json in $pkgDir (placeholder may exist)"; fi
    if $DRY_RUN; then
      log "[DRY] (cd $pkgDir && $PKG_MANAGER_RESOLVED install)"
    else
      (cd "$dir" && $PKG_MANAGER_RESOLVED install || warn "Install failed in $pkgDir")
    fi
  done
  ok "Node dependencies processed"
}

# -------------------- Database Initialization -------------------------------
init_database_scaffold() {
  if ! $DB_INIT; then return; fi
  info "Initializing database scaffold (Drizzle)"
  local cfg="$ROOT_DIR/packages/db/drizzle.config.ts"
  local migDir="$ROOT_DIR/packages/db/src/migrations"
  if $DRY_RUN; then
    log "[DRY] create $cfg"
    log "[DRY] create migration placeholder"
  else
    if [ ! -f "$cfg" ]; then
      cat > "$cfg" <<'DRIZZLE'
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema',
  out: './src/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/colorwerkz'
  }
});
DRIZZLE
    fi
    mkdir -p "$migDir"
    local stamp=$(date +%Y%m%d_%H%M%S)
    local migFile="$migDir/${stamp}_init.sql"
    if [ ! -f "$migFile" ]; then
      echo "-- Initial migration placeholder" > "$migFile"
    fi
  fi
  ok "Database scaffold ready"
}

# --------------------- Report Generation -------------------------------------
generate_report() {
  local duration=$(( $(date +%s) - START_TIME ))
  local json='{'"\n"''
  json+="  \"node\": {\"found\": $NODE_OK, \"version\": \"$NODE_VERSION\"},\n"
  json+="  \"packageManager\": {\"name\": \"$PKG_MANAGER_RESOLVED\", \"available\": $PKG_MANAGER_OK},\n"
  json+="  \"python\": {\"found\": $PY_OK, \"version\": \"$PY_VERSION\", \"missingPackages\": ["
  for i in "${!MISSING_PY_PKGS[@]}"; do
    json+="\"${MISSING_PY_PKGS[$i]}\""; [ $i -lt $(( ${#MISSING_PY_PKGS[@]} - 1 )) ] && json+=",";
  done
  json+="]},\n"
  json+="  \"postgres\": {\"found\": $PSQL_OK, \"version\": \"$PSQL_VERSION\"},\n"
  json+="  \"git\": {\"found\": $GIT_OK, \"version\": \"$GIT_VERSION\"},\n"
  json+="  \"gpuCapable\": $GPU_CAPABLE,\n"
  json+="  \"virtualEnv\": {\"enabled\": $CREATE_VENV, \"path\": \"$VENV_PATH\", \"created\": $VENV_CREATED},\n"
  json+="  \"root\": \"$ROOT_DIR\",\n"
  json+="  \"durationSeconds\": $duration\n"
  json+="}"
  if $DRY_RUN; then
    info "[DRY] Would write report to $REPORT_FILE"
    printf "%s\n" "$json"
  else
    printf "%s\n" "$json" > "$REPORT_FILE"
    ok "Environment report written to $REPORT_FILE"
  fi
}

# -------------------------- Execution Flow -----------------------------------
main() {
  info "Starting ColorWerkz universal setup"
  $STRUCTURE_ONLY || system_checks
  if $CHECK_ONLY; then
    generate_report
    info "Check-only mode complete"
    exit 0
  fi
  create_structure
  create_virtual_env
  install_node_dependencies
  init_database_scaffold
  create_env_example
  db_check_connectivity
  generate_report
  info "Setup complete. Review warnings above.";
  if ! $FORCE; then
    if ! $NODE_OK || ! $PY_OK || [ ${#MISSING_PY_PKGS[@]} -gt 0 ]; then
      warn "One or more prerequisites not satisfied. Install missing components before development. Use --force to ignore."
    fi
  fi
  printf "\n${BOLD}Next Steps:${RESET}\n"
  printf "  1. Install Node dependencies in web/api packages.\n"
  printf "  2. Create virtual env and install Python requirements.\n"
  printf "  3. Initialize database migrations under packages/db/src/migrations.\n"
  printf "  4. Start AI service: 'uvicorn services/ai-service/app.main:app --reload'.\n"
  printf "  5. If needed, create .env from .env.example and run with --db-check to verify DB.\n"
  printf "  6. Begin implementing Week 1 security tasks from TODO list.\n"
}

main "$@"

exit 0
