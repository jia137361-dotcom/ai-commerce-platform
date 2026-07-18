/**
 * Buyer-facing English labels for supply-chain category chips.
 * Mirrors backend resolveCategoryEnglishLabel for offline/fallback paths.
 */

const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/

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
  POLO衫: "Polo shirt",
}

function looksEnglish(value: string): boolean {
  const letters = value.replace(/[^A-Za-z\u00C0-\u024F]/g, "")
  return letters.length >= 2 && !CJK_RE.test(value)
}

export function toEnglishCategoryLabel(
  name?: string | null,
  enName?: string | null,
  id?: number
): string {
  const candidates = [enName, name].filter((value): value is string => Boolean(value?.trim())).map((v) => v.trim())
  for (const candidate of candidates) {
    if (looksEnglish(candidate)) return candidate
  }
  for (const candidate of candidates) {
    const mapped = ZH_TO_EN[candidate]
    if (mapped) return mapped
  }
  for (const candidate of candidates) {
    const stripped = candidate.replace(CJK_RE, " ").replace(/\s+/g, " ").trim()
    if (stripped && looksEnglish(stripped)) return stripped
  }
  return candidates[0] || (id ? `Category ${id}` : "Category")
}
