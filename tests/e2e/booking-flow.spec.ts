/// <reference path="./playwright.d.ts" />
// Playwright end-to-end test specification skeleton for the complete booking flow
// Test flow: Customer books -> Partner accepts atomically -> Two-OTP handshake -> Completion
import { test, expect } from '@playwright/test';

test.describe('HomeServeX Core End-to-End Workflow', () => {
  test('Customer Portal loads hero, search, and category listing', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle(/HomeServeX/);
    await expect(page.locator('text=HomeServeX').first()).toBeVisible();
    await expect(page.locator('text=Service Categories')).toBeVisible();
  });

  test('Partner App loads dedicated portal and authentication entry', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await expect(page.locator('text=Service Partner Portal').or(page.locator('text=Welcome Back, Partner')).first()).toBeVisible();
  });

  test('Admin Console loads operations entry and dashboard', async ({ page }) => {
    await page.goto('http://localhost:5175');
    await expect(page.locator('text=HomeServeX Operations').or(page.locator('text=Admin Login')).first()).toBeVisible();
  });
});
