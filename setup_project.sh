#!/usr/bin/env sh
# Modern Minimal UI scaffolding script (POSIX-compliant)
# Constructs a Tailwind CSS project with an off-white/gray/black palette.

set -eu

say() { printf "%s\n" "$*"; }
fail() { say "Error: $*" 1>&2; exit 1; }

# 1) Dependency verification
for cmd in node npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "$cmd is not installed or not on PATH. Please install Node.js (includes npm)."
  fi
done

# npx typically ships with npm. Soft check.
if ! command -v npx >/dev/null 2>&1; then
  fail "npx not found. Ensure your npm installation includes npx."
fi

PROJECT_DIR="$(pwd)"
SRC_DIR="$PROJECT_DIR/src"
DIST_DIR="$PROJECT_DIR/dist"
STYLES_DIR="$SRC_DIR/styles"

say "Creating directory structure…"
mkdir -p "$STYLES_DIR" "$DIST_DIR" "$PROJECT_DIR/public" "$PROJECT_DIR/.vscode"

# 2) Initialize npm project
say "Initializing npm project…"
# If package.json exists, do not overwrite metadata; we will replace it afterwards if needed.
if [ ! -f "$PROJECT_DIR/package.json" ]; then
  npm init -y >/dev/null 2>&1 || fail "npm init failed"
else
  say "package.json already exists; will update scripts as needed."
fi

# 3) Install Tailwind CSS toolchain
say "Installing Tailwind CSS toolchain…"
npm install -D tailwindcss postcss autoprefixer >/dev/null 2>&1 || fail "npm install failed"

# 4) Write configuration and source files
say "Writing configuration and source files…"

# package.json (overwrites scripts to ensure build works repeatably)
# We preserve name/version/private if present, else we provide defaults.
# Simpler and robust approach: write a minimal package.json with required scripts if none existed.
if [ ! -f "$PROJECT_DIR/package.json" ]; then
cat <<'EOF' > "$PROJECT_DIR/package.json"
{
  "name": "modern-minimal-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tailwindcss -i ./src/styles/input.css -o ./dist/styles.css --watch",
    "build": "tailwindcss -i ./src/styles/input.css -o ./dist/styles.css --minify"
  }
}
EOF
else
  # Update scripts in existing package.json in a portable way by rewriting file
  # Extract name/version if present; otherwise use defaults.
  NAME=$(node -e "try{process.stdout.write(require('./package.json').name||'modern-minimal-ui')}catch(e){process.stdout.write('modern-minimal-ui')}") || NAME="modern-minimal-ui"
  VERSION=$(node -e "try{process.stdout.write(require('./package.json').version||'0.1.0')}catch(e){process.stdout.write('0.1.0')}") || VERSION="0.1.0"
  PRIVATE=$(node -e "try{process.stdout.write(String(require('./package.json').private ?? true))}catch(e){process.stdout.write('true')}") || PRIVATE="true"
  cat > "$PROJECT_DIR/package.json" <<EOF
{
  "name": "${NAME}",
  "version": "${VERSION}",
  "private": ${PRIVATE},
  "type": "module",
  "scripts": {
    "dev": "tailwindcss -i ./src/styles/input.css -o ./dist/styles.css --watch",
    "build": "tailwindcss -i ./src/styles/input.css -o ./dist/styles.css --minify"
  }
}
EOF
fi

# tailwind.config.js
cat <<'EOF' > "$PROJECT_DIR/tailwind.config.js"
/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,html}'
  ],
  theme: {
    extend: {
      colors: {
        'off-white': '#F9FAFB',
        'ink-black': '#000000',
        'soft-gray': '#9CA3AF'
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans]
      }
    }
  },
  plugins: []
}
EOF

# postcss.config.js
cat <<'EOF' > "$PROJECT_DIR/postcss.config.js"
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
EOF

# src/styles/input.css
cat <<'EOF' > "$STYLES_DIR/input.css"
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { -webkit-text-size-adjust: 100%; }
  body { @apply bg-off-white text-ink-black antialiased font-sans; }
}
EOF

# index.html
cat <<'EOF' > "$PROJECT_DIR/index.html"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Modern Minimal UI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="./dist/styles.css" />
  </head>
  <body class="bg-off-white text-ink-black font-sans">
    <main class="min-h-screen flex flex-col items-center justify-center px-6">
      <header class="mb-8 text-center">
        <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">ColorWerkz</h1>
        <p class="mt-2 text-sm text-soft-gray">A modern, minimal Tailwind scaffold.</p>
      </header>

      <section class="w-full max-w-md">
        <form class="space-y-4 border border-gray-200/80 rounded-lg p-4 bg-white shadow-sm">
          <label class="block">
            <span class="text-sm text-gray-700">Hex Color</span>
            <input type="text" placeholder="#111827" class="mt-1 block w-full rounded-md border-gray-300 focus:border-ink-black focus:ring-ink-black" />
          </label>
          <button type="button" class="w-full inline-flex justify-center rounded-md bg-ink-black text-white py-2 px-3 text-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black/20">Submit</button>
        </form>
      </section>

      <footer class="mt-10 text-xs text-gray-500">&copy; <span id="y"></span> ColorWerkz</footer>
    </main>
    <script>document.getElementById('y').textContent = new Date().getFullYear();</script>
  </body>
</html>
EOF

# .gitignore
cat <<'EOF' > "$PROJECT_DIR/.gitignore"
node_modules
.DS_Store
dist
EOF

# 5) Build initial CSS output
say "Building Tailwind CSS output…"
npx tailwindcss -i ./src/styles/input.css -o ./dist/styles.css --minify >/dev/null 2>&1 || fail "Tailwind build failed"

say "\nSuccess. Open index.html in a browser to view the UI."
say "Development:   npm run dev"
say "Production build: npm run build"
