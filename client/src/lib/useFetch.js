import { useCallback, useEffect, useState } from 'react'
import { api, apiErrorMessage } from './api'

/** Simple data-fetching hook with loading / error / empty handling and refetch. */
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    // Pass a null/undefined url to skip fetching (e.g. auth-gated endpoints)
    if (!url) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(url)
      setData(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refetch: load }
}
