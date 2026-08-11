/**
 * Prefer English category labels for buyer catalog chips.
 * S2BDIY often returns Chinese `name` with empty / partial `en_name`.
 */

const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/

/** Common S2BDIY category names → English display. */
const ZH_TO_EN: Record<string, string> = {
  浴室用品: "Bathroom supplies",
  寝具用品: "Bedding",
  厨房用品: "Kitchenware",
  杯具用品: "Drinkware",
  护理用品: "Care products",
  雨具用品: "Rain gear",
  餐厅用品: "Dining supplies",
  "裤子/裙子": "Pants / skirts",
  短袖T恤: "Short-sleeve T-shirt",
  长袖T恤: "Long-sleeve T-shirt",
  文胸内裤: "Underwear",
  泳装: "Swimwear",
  服装: "Apparel",
  宠物家居: "Pet home",
  宠物服装: "Pet clothing",
  户外用品: "Outdoor products",
  口罩: "Face masks",
  苹果手机壳: "iPhone case",
  手机支架: "Phone stand",
  收纳用品: "Storage",
  三星手机壳: "Samsung phone case",
  华为手机壳: "Huawei phone case",
  苹果表带: "Apple Watch band",
  苹果耳机套: "AirPods case",
  鼠标垫: "Mouse pad",
  oppo手机壳: "OPPO phone case",
  充电器: "Charger",
  保护套: "Protective case",
  午餐包: "Lunch bag",
  行李箱: "Suitcase",
  书包: "School bag",
  挎包: "Shoulder bag",
  电脑包: "Laptop bag",
  钱包: "Wallet",
  手提包: "Handbag",
  行李包: "Duffel bag",
  妈咪包: "Diaper bag",
  运动包: "Sports bag",
  玩具类: "Toys",
  婴儿用品: "Baby products",
  汽车外饰: "Car exterior",
  汽车内饰: "Car interior",
  箱包: "Bags & luggage",
  鞋服: "Shoes & apparel",
  服装配饰: "Clothing accessories",
  数码配件: "Digital accessories",
  汽车配件: "Auto accessories",
  家居用品: "Household items",
  服饰内衣: "Clothing underwear",
  鞋靴: "Footwear",
  帽子: "Hats",
  首饰: "Jewelry",
  珠宝: "Jewelry",
  节日用品: "Holiday supplies",
  其他: "Other",
  庭院装饰: "Courtyard decoration",
  户外产品: "Outdoor products",
  POLO衫: "Polo shirt",
}

function readField(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function looksMostlyEnglish(value: string): boolean {
  const letters = value.replace(/[^A-Za-z\u00C0-\u024F]/g, "")
  if (letters.length >= 2) return true
  if (!CJK_RE.test(value) && /[A-Za-z]/.test(value)) return true
  return false
}

function stripCjkKeepLatin(value: string): string | null {
  const stripped = value
    .replace(CJK_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
  return stripped && looksMostlyEnglish(stripped) ? stripped : null
}

export function resolveCategoryEnglishLabel(
  row: Record<string, unknown>,
  fallbackId?: number | string
): { name: string; en_name?: string } {
  const candidates = [
    readField(row, "en_name", "enName", "name_en", "english_name", "englishName"),
    readField(row, "name", "title", "label"),
  ].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    if (looksMostlyEnglish(candidate) && !CJK_RE.test(candidate)) {
      return { name: candidate, en_name: candidate }
    }
  }

  for (const candidate of candidates) {
    const mapped = ZH_TO_EN[candidate] || ZH_TO_EN[candidate.replace(/\s+/g, "")]
    if (mapped) return { name: mapped, en_name: mapped }
  }

  for (const candidate of candidates) {
    if (looksMostlyEnglish(candidate)) {
      const cleaned = stripCjkKeepLatin(candidate) || candidate.replace(CJK_RE, "").trim()
      if (cleaned) return { name: cleaned, en_name: cleaned }
    }
  }

  for (const candidate of candidates) {
    const partial = stripCjkKeepLatin(candidate)
    if (partial) return { name: partial, en_name: partial }
  }

  const id = fallbackId != null ? String(fallbackId) : ""
  return { name: id ? `Category ${id}` : "Category" }
}
