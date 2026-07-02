import { useCallback, useEffect, useState } from "react"
import { fetchStoreFollowState, updateStoreFollowState } from "../lib/buyer-api"
import { readGuestFollowState, writeGuestFollowState } from "../lib/storefront-preferences"

export function useStoreFollow(storeId: string, initialFollowerCount = 0) {
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    void fetchStoreFollowState()
      .then((state) => {
        if (!active) return
        setFollowing(state.following || readGuestFollowState(storeId))
        setFollowerCount(state.follower_count)
      })
      .catch(() => {
        if (!active) return
        setFollowing(readGuestFollowState(storeId))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [storeId])

  const toggleFollow = useCallback(async () => {
    const next = !following
    setPending(true)
    try {
      const state = await updateStoreFollowState(next)
      setFollowing(state.following || next)
      setFollowerCount(state.follower_count)
      writeGuestFollowState(storeId, next)
    } catch {
      writeGuestFollowState(storeId, next)
      setFollowing(next)
    } finally {
      setPending(false)
    }
  }, [following, storeId])

  return { following, followerCount, loading, pending, toggleFollow }
}
