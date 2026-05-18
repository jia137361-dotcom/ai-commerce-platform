import { model } from "@medusajs/framework/utils"

const PlatformDesignTemplate = model.define("mc_platform_design_template", {
  id: model.id({ prefix: "pdt" }).primaryKey(),
  platform_product_id: model.text(),
  name: model.text(),
  canvas_width: model.number(),
  canvas_height: model.number(),
  design_area_x: model.number(),
  design_area_y: model.number(),
  design_area_width: model.number(),
  design_area_height: model.number(),
  preview_background_url: model.text().nullable(),
  status: model.enum(["active", "inactive", "archived"]).default("active")
})

export default PlatformDesignTemplate
