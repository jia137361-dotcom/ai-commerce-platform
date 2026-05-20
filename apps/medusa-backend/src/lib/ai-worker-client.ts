export type AiWorkerGenerateResult = {
  ai_job_id: string
  prompt: string
  platform_product_id: string
  supplier_id?: string | null
  supplier_product_id: string
  supplier_variant_id?: string | null
  print_position: string
  design_image_url: string
  print_file_url: string
  mockup_image_url: string
  title: string
  description: string
  tags: string[]
  seo: { title: string; description: string }
  price_suggestion: number
  mock_mode?: boolean
}

export type AiWorkerGenerateInput = {
  prompt: string
  platform_product_id: string
  supplier_product_id: string
  supplier_variant_id?: string | null
  print_position?: string
  base_cost?: number | null
}

export async function callAiWorkerGenerateProduct(
  input: AiWorkerGenerateInput
): Promise<AiWorkerGenerateResult> {
  const baseUrl = (process.env.AI_WORKER_BASE_URL || "http://localhost:8001").replace(
    /\/$/,
    ""
  )
  const response = await fetch(`${baseUrl}/ai/generate-product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: input.prompt,
      platform_product_id: input.platform_product_id,
      supplier_product_id: input.supplier_product_id,
      supplier_variant_id: input.supplier_variant_id ?? null,
      print_position: input.print_position ?? "front",
      base_cost: input.base_cost ?? null,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI worker error ${response.status}: ${text}`)
  }

  return (await response.json()) as AiWorkerGenerateResult
}
