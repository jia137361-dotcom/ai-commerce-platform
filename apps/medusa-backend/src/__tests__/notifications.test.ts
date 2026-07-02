import {
  normalizeNotification,
  parseNotificationsListQuery,
} from "../lib/notifications"

describe("parseNotificationsListQuery", () => {
  it("parses limit offset and unread_only", () => {
    expect(parseNotificationsListQuery({ limit: "10", offset: "5", unread_only: "true" })).toEqual({
      limit: 10,
      offset: 5,
      unreadOnly: true,
    })
  })
})

describe("normalizeNotification", () => {
  it("maps read flag from read_at", () => {
    expect(
      normalizeNotification({
        id: "ntf_1",
        store_id: "default_store",
        type: "order_paid",
        title: "New order",
        body: "Order #1",
        read_at: null,
        metadata: {},
        created_at: "2026-06-15T00:00:00.000Z",
      })
    ).toMatchObject({ read: false })

    expect(
      normalizeNotification({
        id: "ntf_2",
        store_id: "default_store",
        type: "ai_complete",
        title: "Done",
        read_at: "2026-06-15T01:00:00.000Z",
        metadata: {},
      })
    ).toMatchObject({ read: true })
  })
})
