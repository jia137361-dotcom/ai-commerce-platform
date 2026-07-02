import { test, expect } from "@playwright/test"

test.describe("Seller login", () => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, "Requires ADMIN_EMAIL and ADMIN_PASSWORD")

  test("logs in and lands on products", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(process.env.ADMIN_EMAIL!)
    await page.getByLabel(/password/i).fill(process.env.ADMIN_PASSWORD!)
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/products/)
    await expect(page.getByRole("heading", { name: /products/i })).toBeVisible()
  })
})

test.describe("Seller navigation", () => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, "Requires ADMIN_EMAIL and ADMIN_PASSWORD")

  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(process.env.ADMIN_EMAIL!)
    await page.getByLabel(/password/i).fill(process.env.ADMIN_PASSWORD!)
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/products/)
  })

  test("navigates to settings and ai studio", async ({ page }) => {
    await page.getByRole("link", { name: /settings/i }).click()
    await expect(page.getByRole("heading", { name: /store settings/i })).toBeVisible()
    await page.getByRole("link", { name: /ai studio/i }).click()
    await expect(page.getByRole("heading", { name: /create product with ai/i })).toBeVisible()
  })
})
