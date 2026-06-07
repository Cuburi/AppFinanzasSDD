import { copyFileSync } from 'node:fs';

const profile = process.argv[2];

const profiles = {
  dev: '.env.dev.example',
  personal: '.env.personal.example',
};

if (!Object.hasOwn(profiles, profile)) {
  console.error('Usage: node scripts/use-env-profile.mjs dev|personal');
  process.exit(1);
}

copyFileSync(new URL(`../${profiles[profile]}`, import.meta.url), new URL('../.env', import.meta.url));

console.log(`Copied ${profiles[profile]} to .env.`);
