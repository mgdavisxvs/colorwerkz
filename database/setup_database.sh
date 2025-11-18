#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ColorWerkz Database Setup Script
# Sets up PostgreSQL database with schema and indexes
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# ───────────────────────────────────────────────────────────────────────────
# Configuration
# ───────────────────────────────────────────────────────────────────────────

DB_NAME="${DB_NAME:-colorwerkz_dev}"
DB_USER="${DB_USER:-$(whoami)}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ───────────────────────────────────────────────────────────────────────────
# Functions
# ───────────────────────────────────────────────────────────────────────────

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_postgres() {
    log_info "Checking PostgreSQL installation..."

    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL not found. Please install PostgreSQL first."
        exit 1
    fi

    log_info "PostgreSQL version: $(psql --version)"
}

database_exists() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"
}

create_database() {
    log_info "Creating database: $DB_NAME"

    if database_exists; then
        log_warn "Database '$DB_NAME' already exists"
        read -p "Drop and recreate? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Dropping existing database..."
            dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists
        else
            log_info "Using existing database"
            return 0
        fi
    fi

    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    log_info "✓ Database created successfully"
}

run_schema() {
    log_info "Creating database schema..."

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$SCRIPT_DIR/schema.sql" \
        -v ON_ERROR_STOP=1

    log_info "✓ Schema created successfully"
}

run_migrations() {
    log_info "Running migrations..."

    # Run all migration files in order
    for migration in "$SCRIPT_DIR/migrations"/*.sql; do
        if [ -f "$migration" ]; then
            log_info "  Running: $(basename "$migration")"
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                -f "$migration" \
                -v ON_ERROR_STOP=1
        fi
    done

    log_info "✓ Migrations completed successfully"
}

verify_setup() {
    log_info "Verifying database setup..."

    # Check tables
    tables=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

    log_info "  Tables created: $tables"

    # Check indexes
    indexes=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")

    log_info "  Indexes created: $indexes"

    # List tables
    log_info "  Tables:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "\dt" | grep -E '(color_combinations|training_samples|model_checkpoints|processing_jobs)' || true

    log_info "✓ Verification complete"
}

print_connection_info() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "Database setup complete!"
    log_info "═══════════════════════════════════════════════════════════════"
    echo ""
    log_info "Connection details:"
    echo "  Database: $DB_NAME"
    echo "  Host:     $DB_HOST"
    echo "  Port:     $DB_PORT"
    echo "  User:     $DB_USER"
    echo ""
    log_info "Connection string:"
    echo "  DATABASE_URL=postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    log_info "Connect with psql:"
    echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
}

# ───────────────────────────────────────────────────────────────────────────
# Main execution
# ───────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "ColorWerkz Database Setup"
    log_info "═══════════════════════════════════════════════════════════════"
    echo ""

    check_postgres
    create_database
    run_schema
    run_migrations
    verify_setup
    print_connection_info
}

# Run main function
main
