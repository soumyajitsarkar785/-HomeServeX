/**
 * Environment and Workspace Pre-flight Verification Script
 */
import fs from 'fs';
import path from 'path';

console.log('🔍 Checking HomeServeX workspace foundation...');

const requiredDirs = [
  'apps/customer',
  'apps/partner',
  'apps/admin',
  'apps/api',
  'packages/shared-types',
  'packages/validation',
  'packages/api-client',
  'packages/design-tokens',
  'packages/ui',
  'prisma',
  'docs',
  'tests',
];

let allOk = true;
for (const dir of requiredDirs) {
  if (fs.existsSync(dir)) {
    console.log(`  ✓ ${dir}`);
  } else {
    console.error(`  ✗ Missing directory: ${dir}`);
    allOk = false;
  }
}

const requiredFiles = [
  'package.json',
  'tsconfig.base.json',
  '.gitignore',
  '.env.example',
  'eslint.config.js',
  'prisma/schema.prisma',
  'prisma/seed.ts',
  'docs/architecture.md',
  'docs/database.md',
  'docs/api.md',
  'docs/setup.md',
  'docs/testing.md',
  'docs/deployment.md',
  'docs/troubleshooting.md',
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.error(`  ✗ Missing file: ${file}`);
    allOk = false;
  }
}

if (allOk) {
  console.log('\n✅ All Phase 1 foundation directories and files verified successfully.');
} else {
  console.error('\n❌ Some required files or directories are missing.');
  process.exit(1);
}
