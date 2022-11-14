import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

const getWsUrl = (token) => {
  const wsUrl = new URL(`/connect/${token}`, location)
  wsUrl.protocol = wsUrl.protocol.replace('http', 'ws')
  return wsUrl.toString()
}

const useSession = (token, onMessage) => {
  const [init, setInit] = useState()
  const onMessageRef = useRef()
  const sendMessageRef = useRef()
  useEffect(() => {
    const conn = new WebSocket(getWsUrl(token))
    sendMessageRef.current = (msg) => conn.send(msg)
    let hasInit = false
    const handler = async (evt) => {
      const data = await evt.data.text()
      if (!hasInit) {
        setInit(JSON.parse(data))
        hasInit = true
        return
      }
      onMessageRef.current?.(data)
    }
    conn.addEventListener('message', handler)
    return () => {
      conn.removeEventListener('message', handler)
      conn.close()
    }
  }, [token])
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])
  const sendMessage = useCallback((msg) => {
    sendMessageRef.current?.(msg)
  }, [])
  return [init, sendMessage]
}

export { useSession }
