#!/bin/bash
# Glass Material Renderer - Build Script
# Comprehensive build automation with error handling

set -euo pipefail

# ============================================================================
# Configuration Variables
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="${SCRIPT_DIR%/samples*}"
readonly BUILD_DIR="${PROJECT_ROOT}/build"
readonly DIST_DIR="${PROJECT_ROOT}/dist"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Configuration arrays
declare -a PLATFORMS=("linux-x64" "macos-arm64" "windows-x64")
declare -a QUALITY_LEVELS=("low" "medium" "high" "ultra")
declare -A QUALITY_PARAMS=(
  [low]="--samples=64 --bounces=2"
  [medium]="--samples=256 --bounces=4"
  [high]="--samples=1024 --bounces=8"
  [ultra]="--samples=4096 --bounces=16"
)

# Flags
VERBOSE=false
CLEAN_BUILD=false
BUILD_DOCS=false
RUN_TESTS=true

# ============================================================================
# Logging Functions
# ============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*" >&2
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

# ============================================================================
# Error Handling and Cleanup
# ============================================================================

cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_error "Build failed with exit code $exit_code"
    # Trap handler cleanup
    rm -rf "${BUILD_DIR}/.tmp" 2>/dev/null || true
  fi
  return $exit_code
}

trap cleanup EXIT INT TERM

# ============================================================================
# Utility Functions
# ============================================================================

print_usage() {
  cat << 'EOF'
Usage: build.sh [OPTIONS]

Options:
  -c, --clean       Clean build directory before building
  -v, --verbose     Enable verbose output
  -d, --docs        Build documentation
  -s, --skip-tests  Skip running tests
  -h, --help        Show this help message

Examples:
  ./build.sh --clean --verbose
  ./build.sh -v -d -s

EOF
}

check_dependencies() {
  local deps=("node" "npm" "rustc" "cargo" "python3")
  local missing=()

  for cmd in "${deps[@]}"; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing dependencies: ${missing[*]}"
    return 1
  fi

  log_success "All dependencies found"
}

# ============================================================================
# Build Functions
# ============================================================================

build_typescript() {
  log_info "Building TypeScript..."

  cd "${PROJECT_ROOT}"

  # Command substitution
  local tsfiles=$(find src -name "*.ts" -o -name "*.tsx" | wc -l)
  log_info "Found $tsfiles TypeScript files"

  npm run type-check || {
    log_error "TypeScript type checking failed"
    return 1
  }

  npm run build:ts || {
    log_error "TypeScript compilation failed"
    return 1
  }

  log_success "TypeScript build complete"
}

build_rust() {
  log_info "Building Rust components..."

  cd "${PROJECT_ROOT}"

  # Arithmetic expansion
  local parallel_jobs=$(( $(nproc) - 1 ))
  parallel_jobs=$(( parallel_jobs < 1 ? 1 : parallel_jobs ))

  if [ "$CLEAN_BUILD" = true ]; then
    log_info "Cleaning Rust build artifacts..."
    cargo clean
  fi

  # Heredoc for build configuration
  cat > .cargo/config.local << 'HEREDOC'
[build]
jobs = 4
rustflags = ["-C", "opt-level=3"]

[term]
verbose = false
HEREDOC

  cargo build --release --jobs "$parallel_jobs" || {
    log_error "Rust compilation failed"
    return 1
  }

  log_success "Rust build complete"
}

build_python() {
  log_info "Building Python components..."

  cd "${PROJECT_ROOT}"

  # Check Python version
  local python_version
  python_version=$(python3 --version 2>&1 | awk '{print $2}')
  log_info "Python version: $python_version"

  # Conditional building
  if [ -f "pyproject.toml" ]; then
    pip install -e . --quiet || {
      log_error "Python package installation failed"
      return 1
    }
  fi

  log_success "Python build complete"
}

run_tests() {
  if [ "$RUN_TESTS" = false ]; then
    log_warning "Tests skipped"
    return 0
  fi

  log_info "Running tests..."

  cd "${PROJECT_ROOT}"

  # Array iteration
  local failed_tests=()

  # TypeScript tests
  if npm run test:ts 2>/dev/null; then
    log_success "TypeScript tests passed"
  else
    failed_tests+=("TypeScript")
  fi

  # Rust tests
  if cargo test --release 2>/dev/null; then
    log_success "Rust tests passed"
  else
    failed_tests+=("Rust")
  fi

  # Python tests
  if python3 -m pytest tests/ --quiet 2>/dev/null; then
    log_success "Python tests passed"
  else
    failed_tests+=("Python")
  fi

  # Report results
  if [ ${#failed_tests[@]} -gt 0 ]; then
    log_error "Failed test suites: ${failed_tests[*]}"
    return 1
  fi

  log_success "All tests passed"
}

build_documentation() {
  if [ "$BUILD_DOCS" = false ]; then
    return 0
  fi

  log_info "Building documentation..."

  cd "${PROJECT_ROOT}"

  # Case statement for documentation formats
  local formats=(html pdf markdown)
  for format in "${formats[@]}"; do
    log_info "Generating $format documentation..."
    # Pipe example
    find docs -name "*.md" | while read -r file; do
      # Variable in string (parameter expansion)
      log_info "Processing: $file"
    done
  done

  log_success "Documentation build complete"
}

build_quality_variants() {
  log_info "Building quality variants..."

  # For loop with array
  for quality in "${QUALITY_LEVELS[@]}"; do
    log_info "Building $quality quality variant..."

    # Array access with parameter expansion
    local params="${QUALITY_PARAMS[$quality]}"

    # Redirect output
    if npm run build -- $params > "${BUILD_DIR}/build_${quality}.log" 2>&1; then
      log_success "Built $quality variant"
    else
      log_error "Failed to build $quality variant"
      return 1
    fi
  done
}

package_release() {
  log_info "Packaging release artifacts..."

  cd "${BUILD_DIR}"

  # While loop with file processing
  local total_size=0
  while IFS= read -r -d '' file; do
    local size
    size=$(stat -f%z "$file" 2>/dev/null || stat --format=%s "$file" 2>/dev/null)
    total_size=$(( total_size + size ))
  done < <(find . -type f -print0)

  # Format bytes to human readable
  local size_mb=$(( total_size / 1024 / 1024 ))
  log_info "Total size: ${size_mb}MB"

  # Create archive with proper quoting
  local archive_name="glass-renderer-${TIMESTAMP}.tar.gz"
  tar -czf "${DIST_DIR}/${archive_name}" .

  log_success "Release packaged: $archive_name"
}

# ============================================================================
# Platform-Specific Builds
# ============================================================================

build_for_platform() {
  local platform="$1"

  log_info "Building for platform: $platform"

  case "$platform" in
    linux-x64)
      log_info "Configuring for Linux x86_64..."
      export TARGET="x86_64-unknown-linux-gnu"
      ;;
    macos-arm64)
      log_info "Configuring for macOS ARM64..."
      export TARGET="aarch64-apple-darwin"
      ;;
    windows-x64)
      log_info "Configuring for Windows x86_64..."
      export TARGET="x86_64-pc-windows-msvc"
      ;;
    *)
      log_error "Unknown platform: $platform"
      return 1
      ;;
  esac

  cargo build --release --target "$TARGET" || return 1
  log_success "Built for $platform"
}

# ============================================================================
# Main Build Orchestration
# ============================================================================

main() {
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -c|--clean)
        CLEAN_BUILD=true
        shift
        ;;
      -v|--verbose)
        VERBOSE=true
        set -x
        shift
        ;;
      -d|--docs)
        BUILD_DOCS=true
        shift
        ;;
      -s|--skip-tests)
        RUN_TESTS=false
        shift
        ;;
      -h|--help)
        print_usage
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        print_usage
        exit 1
        ;;
    esac
  done

  log_info "Starting Glass Renderer build..."
  log_info "Timestamp: $TIMESTAMP"

  # Create directories
  mkdir -p "${BUILD_DIR}" "${DIST_DIR}"

  # Execute build steps
  check_dependencies
  build_typescript
  build_rust
  build_python
  build_quality_variants
  run_tests
  build_documentation
  package_release

  log_success "Build completed successfully!"
  log_info "Artifacts available in: ${DIST_DIR}"
}

# ============================================================================
# Script Entry Point
# ============================================================================

# Guard: prevent sourcing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
