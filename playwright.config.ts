import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:90000,workers:1,retries:0,reporter:[['list'],['html',{open:'never'}]],use:{baseURL:process.env.TEST_URL??'http://localhost:3000',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},outputDir:'test-results'});
