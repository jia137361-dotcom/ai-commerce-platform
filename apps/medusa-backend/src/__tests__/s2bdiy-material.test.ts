import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fetchPrintFileBuffer } from "../modules/suppliers/s2bdiy/s2bdiy-material"

describe("fetchPrintFileBuffer", () => {
  const originalUploadDir = process.env.AI_WORKER_UPLOAD_DIR
  const originalFetch = global.fetch

  afterEach(() => {
    process.env.AI_WORKER_UPLOAD_DIR = originalUploadDir
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("reads local AI worker static files from the upload directory before network fetch", async () => {
    const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "s2bdiy-material-"))
    const filename = "print_local.png"
    const expected = Buffer.from("print-file")
    await fs.writeFile(path.join(uploadDir, filename), expected)
    process.env.AI_WORKER_UPLOAD_DIR = uploadDir
    global.fetch = jest.fn(async () => {
      throw new Error("network should not be used")
    }) as unknown as typeof fetch

    const result = await fetchPrintFileBuffer(`http://127.0.0.1:8001/static/${filename}`)

    expect(result.filename).toBe(filename)
    expect(result.buffer.equals(expected)).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
