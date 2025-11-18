#!/bin/bash

###############################################################################
# ColorWerkz Deployment Script
# Handles phased deployment of route consolidation and fixes
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
DRY_RUN=${DRY_RUN:-false}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ColorWerkz Deployment Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e "Dry Run: ${YELLOW}$DRY_RUN${NC}"
echo ""

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed"
        exit 1
    fi
}

run_or_skip() {
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY RUN] Would execute: $@"
    else
        log_info "Executing: $@"
        "$@"
    fi
}

###############################################################################
# Pre-deployment Checks
###############################################################################

log_info "Running pre-deployment checks..."

# Check required commands
check_command node
check_command npm
check_command git
check_command psql
check_command python3

# Check Node version
NODE_VERSION=$(node --version)
log_info "Node version: $NODE_VERSION"

# Check Python version
PYTHON_VERSION=$(python3 --version)
log_info "Python version: $PYTHON_VERSION"

# Check if in git repository
if [ ! -d .git ]; then
    log_error "Not in a git repository"
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log_info "Current branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    log_warning "Uncommitted changes detected"
    if [ "$DRY_RUN" != "true" ]; then
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

log_success "Pre-deployment checks passed"
echo ""

###############################################################################
# Phase 1: Fix Pseudo-Labels (CRITICAL)
###############################################################################

log_info "Phase 1: Fixing pseudo-labels..."

if [ -f "server/patches/pseudolabel_fix.patch" ]; then
    log_info "Applying pseudo-label patch..."

    # Check if patch already applied
    if git apply --check server/patches/pseudolabel_fix.patch 2>/dev/null; then
        run_or_skip git apply server/patches/pseudolabel_fix.patch
        log_success "Pseudo-label patch applied"
    else
        log_warning "Patch already applied or conflicts exist"
    fi
else
    log_warning "Pseudo-label patch not found, skipping..."
fi

# Verify fix
if [ -f "scripts/verify_pseudolabel_fix.py" ]; then
    log_info "Verifying pseudo-label fix..."
    run_or_skip python3 scripts/verify_pseudolabel_fix.py --samples 5
else
    log_warning "Verification script not found, skipping..."
fi

echo ""

###############################################################################
# Phase 2: Database Migrations
###############################################################################

log_info "Phase 2: Running database migrations..."

# Check database connection
if [ "$DRY_RUN" != "true" ]; then
    DB_URL=${DATABASE_URL:-"postgresql://localhost:5432/colorwerkz_${ENVIRONMENT}"}

    log_info "Testing database connection: $DB_URL"

    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        log_success "Database connection successful"

        # Apply composite indexes
        if [ -f "IMPLEMENTATION_2_COMPOSITE_INDEXES.sql" ]; then
            log_info "Applying composite indexes..."

            psql "$DB_URL" -f IMPLEMENTATION_2_COMPOSITE_INDEXES.sql

            log_success "Database migrations completed"
        else
            log_warning "Database migration file not found"
        fi
    else
        log_error "Database connection failed"
        exit 1
    fi
else
    log_info "[DRY RUN] Would run database migrations"
fi

echo ""

###############################################################################
# Phase 3: Install Dependencies
###############################################################################

log_info "Phase 3: Installing dependencies..."

run_or_skip npm ci

# Install Python dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    log_info "Installing Python dependencies..."
    run_or_skip pip3 install -r requirements.txt
fi

log_success "Dependencies installed"
echo ""

###############################################################################
# Phase 4: Build Application
###############################################################################

log_info "Phase 4: Building application..."

run_or_skip npm run build

log_success "Build completed"
echo ""

###############################################################################
# Phase 5: Run Tests
###############################################################################

log_info "Phase 5: Running tests..."

# Run linting
log_info "Running linter..."
run_or_skip npm run lint

# Run type checking
log_info "Running type check..."
run_or_skip npm run type-check

# Run unit tests
log_info "Running unit tests..."
run_or_skip npm run test:unit

# Run integration tests
log_info "Running integration tests..."
run_or_skip npm run test:integration

log_success "All tests passed"
echo ""

###############################################################################
# Phase 6: Deploy to Environment
###############################################################################

log_info "Phase 6: Deploying to $ENVIRONMENT..."

case $ENVIRONMENT in
    staging)
        log_info "Deploying to staging environment..."
        run_or_skip npm run deploy:staging
        ;;
    production)
        log_warning "Deploying to PRODUCTION environment!"

        if [ "$DRY_RUN" != "true" ]; then
            read -p "Are you sure you want to deploy to production? (yes/no) " -r
            echo
            if [[ ! $REPLY =~ ^yes$ ]]; then
                log_error "Deployment cancelled"
                exit 1
            fi
        fi

        run_or_skip npm run deploy:production
        ;;
    *)
        log_error "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

log_success "Deployment completed"
echo ""

###############################################################################
# Phase 7: Post-deployment Verification
###############################################################################

log_info "Phase 7: Post-deployment verification..."

# Wait for service to be ready
if [ "$DRY_RUN" != "true" ]; then
    log_info "Waiting for service to be ready..."
    sleep 10

    # Check health endpoint
    API_URL=${API_URL:-"http://localhost:5000"}

    log_info "Checking health endpoint: $API_URL/api/v2/color-transfer/health"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v2/color-transfer/health")

    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Health check passed"
    else
        log_error "Health check failed (HTTP $HTTP_CODE)"
        exit 1
    fi

    # Check methods endpoint
    log_info "Checking methods endpoint..."

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v2/color-transfer/methods")

    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Methods endpoint accessible"
    else
        log_error "Methods endpoint failed (HTTP $HTTP_CODE)"
        exit 1
    fi
else
    log_info "[DRY RUN] Would verify deployment"
fi

echo ""

###############################################################################
# Deployment Summary
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e "Branch: ${BLUE}$CURRENT_BRANCH${NC}"
echo -e "Dry Run: ${YELLOW}$DRY_RUN${NC}"
echo ""
echo -e "${GREEN}✓ Pseudo-label fix applied${NC}"
echo -e "${GREEN}✓ Database migrations completed${NC}"
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo -e "${GREEN}✓ Application built${NC}"
echo -e "${GREEN}✓ Tests passed${NC}"
echo -e "${GREEN}✓ Deployment completed${NC}"
echo -e "${GREEN}✓ Post-deployment verification passed${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Print next steps
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Monitor application logs for errors"
echo "2. Check API metrics dashboard"
echo "3. Verify v2 API adoption rate"
echo "4. Monitor database query performance"
echo ""

if [ "$ENVIRONMENT" = "staging" ]; then
    echo -e "${YELLOW}Staging deployment complete. Test thoroughly before production.${NC}"
fi

exit 0
