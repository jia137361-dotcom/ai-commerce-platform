import { MedusaService } from "@medusajs/framework/utils"
import ProcessedWebhookEvent from "./models/processed-webhook-event"

class WebhookEventsModuleService extends MedusaService({
  ProcessedWebhookEvent,
}) {}

export default WebhookEventsModuleService
