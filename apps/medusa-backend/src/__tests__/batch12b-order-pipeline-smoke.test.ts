import {
  assertBatch12bPipelineSmokeEnabled,
  capturedSmokeUnavailableResult,
} from "../scripts/batch12b-order-pipeline-smoke"

describe("Batch 12B terminal order pipeline smoke", () => {
  it("requires an explicit non-production enable flag", () => {
    expect(() =>
      assertBatch12bPipelineSmokeEnabled({ NODE_ENV: "development" })
    ).toThrow("BATCH12B_PIPELINE_SMOKE_ENABLED")

    expect(() =>
      assertBatch12bPipelineSmokeEnabled({
        NODE_ENV: "production",
        BATCH12B_PIPELINE_SMOKE_ENABLED: "true",
      })
    ).toThrow("cannot run in production")

    expect(() =>
      assertBatch12bPipelineSmokeEnabled({
        NODE_ENV: "development",
        BATCH12B_PIPELINE_SMOKE_ENABLED: "true",
      })
    ).not.toThrow()
  })

  it("reports an unavailable capture provider as an explicit skipped result", () => {
    expect(capturedSmokeUnavailableResult()).toEqual({
      lines: {
        CAPTURED_SMOKE_UNAVAILABLE: "provider_does_not_capture",
        CAPTURED_REFUND_RESULT: "SKIPPED",
      },
    })
  })
})
