import { test, expect } from "@playwright/test"

test.describe("Seller login", () => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, "Requires ADMIN_EMAIL and ADMIN_PASSWORD")

  test("logs in and lands on overview", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(process.env.ADMIN_EMAIL!)
    await page.getByLabel(/password/i).fill(process.env.ADMIN_PASSWORD!)
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible()
  })
})

test.describe("Seller navigation", () => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, "Requires ADMIN_EMAIL and ADMIN_PASSWORD")

  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(process.env.ADMIN_EMAIL!)
    await page.getByLabel(/password/i).fill(process.env.ADMIN_PASSWORD!)
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible()
  })

  test("navigates to settings and orders", async ({ page }) => {
    await page.getByRole("link", { name: /settings/i }).click()
    await expect(page.getByRole("heading", { name: /store settings/i })).toBeVisible()
    await page.getByRole("link", { name: /^orders$/i }).click()
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible()
  })
})
