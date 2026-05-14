import WebhookEventsModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const WEBHOOK_EVENTS_MODULE = "webhook_events"

export default Module(WEBHOOK_EVENTS_MODULE, {
  service: WebhookEventsModuleService,
})
