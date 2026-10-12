import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',
  timeout:30000,
  expect:{timeout:10000},
  fullyParallel:true,
  retries:process.env.CI?1:0,
  reporter:'list',
  use:{
    ...devices['Pixel 7'],
    baseURL:'http://127.0.0.1:4173',
    screenshot:'only-on-failure',
    trace:'retain-on-failure'
  },
  webServer:{
    command:'npm run dev -- --host 127.0.0.1 --port 4173',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:60000
  }
});
