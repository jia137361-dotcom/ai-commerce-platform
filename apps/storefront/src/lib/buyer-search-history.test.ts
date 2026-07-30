import {
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
  removeSearchHistory,
} from "./buyer-search-history"

describe("buyer search history", () => {
  const values = new Map<string, string>()

  beforeEach(() => {
    values.clear()
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window")
  })

  it("deduplicates recent terms without changing the latest spelling", () => {
    pushSearchHistory("Mug")
    pushSearchHistory("mug")
    pushSearchHistory("T-shirt")

    expect(readSearchHistory()).toEqual(["T-shirt", "mug"])
  })

  it("removes one term case-insensitively and can clear the rest", () => {
    pushSearchHistory("Mug")
    pushSearchHistory("Poster")

    expect(removeSearchHistory("mug")).toEqual(["Poster"])
    clearSearchHistory()
    expect(readSearchHistory()).toEqual([])
  })
})
