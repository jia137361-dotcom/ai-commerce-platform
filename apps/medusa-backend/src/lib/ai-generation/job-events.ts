import { EventEmitter } from "node:events"

export type AiJobStreamEvent =
  | { type: "progress"; progress: number; current_step: string }
  | { type: "complete"; product_id: string; generation: Record<string, unknown> }
  | { type: "error"; message: string }

const channels = new Map<string, EventEmitter>()

const getChannel = (jobId: string) => {
  let emitter = channels.get(jobId)
  if (!emitter) {
    emitter = new EventEmitter()
    emitter.setMaxListeners(50)
    channels.set(jobId, emitter)
  }
  return emitter
}

export const publishAiJobEvent = (jobId: string, event: AiJobStreamEvent) => {
  getChannel(jobId).emit("event", event)
}

export const subscribeAiJobEvents = (
  jobId: string,
  listener: (event: AiJobStreamEvent) => void
) => {
  const channel = getChannel(jobId)
  channel.on("event", listener)
  return () => {
    channel.off("event", listener)
    if (channel.listenerCount("event") === 0) {
      channels.delete(jobId)
    }
  }
}

export const formatSsePayload = (event: AiJobStreamEvent) =>
  `data: ${JSON.stringify(event)}\n\n`
