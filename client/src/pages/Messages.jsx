import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { MessageSquare, Send, ChevronLeft } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import { LoadingState, ErrorState, EmptyState } from '../components/States'

// Slow fallback poll in case the socket is disconnected (e.g. proxy issues)
const FALLBACK_POLL_MS = 30000

function timeLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function ConversationRow({ convo, meId, active }) {
  const otherName = convo.buyerId?._id === meId ? convo.vendorProfileId?.storeName : convo.buyerId?.name
  const unread = convo.buyerId?._id === meId ? convo.unread?.buyer : convo.unread?.vendor
  return (
    <Link
      to={`/dashboard/messages/${convo._id}`}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-3 ${
        active ? 'bg-muted' : 'hover:bg-muted/60'
      }`}
    >
      <img
        src={convo.pigeonId?.media?.photos?.[0] || '/placeholder.svg?height=44&width=44'}
        alt=""
        className="size-11 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{otherName || 'Conversation'}</p>
          <span className="shrink-0 text-xs text-muted-foreground">{timeLabel(convo.lastMessage?.at)}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {convo.pigeonId?.title ? `${convo.pigeonId.title} · ` : ''}
          {convo.lastMessage?.body || 'No messages yet'}
        </p>
      </div>
      {unread > 0 && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {unread}
        </span>
      )}
    </Link>
  )
}

function Thread({ conversationId, meId }) {
  const [convo, setConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const bottomRef = useRef(null)
  const lastAtRef = useRef(null)
  const typingTimerRef = useRef(null)

  const loadFull = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/messages/conversations/${conversationId}`)
      setConvo(data.data.conversation)
      setMessages(data.data.messages)
      lastAtRef.current = data.data.messages.at(-1)?.createdAt || null
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    loadFull()
  }, [loadFull])

  // Real-time: join the conversation room; receive messages + typing events
  useEffect(() => {
    const socket = getSocket()
    socket.emit('conversation:join', conversationId)

    const onMessage = ({ conversationId: cid, message }) => {
      if (cid !== conversationId) return
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]))
      lastAtRef.current = message.createdAt
      setOtherTyping(false)
    }
    const onTyping = ({ conversationId: cid, userId, isTyping }) => {
      if (cid !== conversationId || userId === meId) return
      setOtherTyping(isTyping)
    }
    socket.on('message:new', onMessage)
    socket.on('typing', onTyping)

    return () => {
      socket.emit('conversation:leave', conversationId)
      socket.off('message:new', onMessage)
      socket.off('typing', onTyping)
    }
  }, [conversationId, meId])

  // Slow fallback poll for missed messages while the socket is down
  useEffect(() => {
    const timer = setInterval(async () => {
      const socket = getSocket()
      if (socket.connected) return
      try {
        const after = lastAtRef.current
        const url = after
          ? `/messages/conversations/${conversationId}?after=${encodeURIComponent(after)}`
          : `/messages/conversations/${conversationId}`
        const { data } = await api.get(url)
        const incoming = data.data.messages
        if (incoming.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m._id))
            const fresh = incoming.filter((m) => !seen.has(m._id))
            return fresh.length ? [...prev, ...fresh] : prev
          })
          lastAtRef.current = incoming.at(-1).createdAt
        }
      } catch {
        // network hiccup — next poll will retry
      }
    }, FALLBACK_POLL_MS)
    return () => clearInterval(timer)
  }, [conversationId])

  // Broadcast my typing state (debounced off after 1.5s of inactivity)
  const notifyTyping = useCallback(() => {
    const socket = getSocket()
    socket.emit('typing', { conversationId, isTyping: true })
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId, isTyping: false })
    }, 1500)
  }, [conversationId])

  useEffect(() => () => clearTimeout(typingTimerRef.current), [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send(e) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const { data } = await api.post(`/messages/conversations/${conversationId}`, { body })
      setMessages((prev) => (prev.some((m) => m._id === data.data._id) ? prev : [...prev, data.data]))
      lastAtRef.current = data.data.createdAt
      setDraft('')
      clearTimeout(typingTimerRef.current)
      getSocket().emit('typing', { conversationId, isTyping: false })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  if (loading) return <LoadingState label="Loading conversation..." />
  if (error && !convo) return <ErrorState message={error} onRetry={loadFull} />
  if (!convo) return null

  const otherName = convo.buyerId?._id === meId ? convo.vendorProfileId?.storeName : convo.buyerId?.name

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border p-3">
        <Link
          to="/dashboard/messages"
          className="rounded-md p-1.5 hover:bg-muted md:hidden"
          aria-label="Back to conversations"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <img
          src={convo.pigeonId?.media?.photos?.[0] || '/placeholder.svg?height=40&width=40'}
          alt=""
          className="size-10 rounded-md object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{otherName}</p>
          {convo.pigeonId && (
            <Link
              to={`/pigeons/${convo.pigeonId._id}`}
              className="block truncate text-xs text-muted-foreground underline hover:text-foreground"
            >
              {convo.pigeonId.title} · ${Number(convo.pigeonId.price).toLocaleString()}
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Say hello and ask about this pigeon.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId || m.senderId?._id === meId
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-right text-[10px] ${mine ? 'opacity-75' : 'text-muted-foreground'}`}>
                  {timeLabel(m.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="sr-only">The other person is typing</span>
              <span aria-hidden="true" className="inline-flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            notifyTyping()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              send(e)
            }
          }}
          rows={1}
          placeholder="Write a message..."
          aria-label="Message"
          className="max-h-32 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden="true" />
          Send
        </button>
      </form>
    </div>
  )
}

export default function Messages() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [convos, setConvos] = useState(null)
  const [error, setError] = useState(null)

  const loadConvos = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations')
      setConvos(data.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    loadConvos()
    // Real-time: refresh the list whenever any of my conversations changes
    const socket = getSocket()
    socket.on('conversation:updated', loadConvos)
    // Slow fallback poll if the socket is down
    const timer = setInterval(() => {
      if (!socket.connected) loadConvos()
    }, FALLBACK_POLL_MS)
    return () => {
      socket.off('conversation:updated', loadConvos)
      clearInterval(timer)
    }
  }, [loadConvos])

  // on desktop with no selection, auto-open the newest conversation
  useEffect(() => {
    if (!conversationId && convos?.length > 0 && window.innerWidth >= 768) {
      navigate(`/dashboard/messages/${convos[0]._id}`, { replace: true })
    }
  }, [conversationId, convos, navigate])

  if (error && !convos) return <ErrorState message={error} onRetry={loadConvos} />
  if (!convos) return <LoadingState label="Loading messages..." />

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <MessageSquare className="size-6 text-primary" aria-hidden="true" />
        Messages
      </h1>

      {convos.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          message='Open a listing and use "Contact Seller" to start chatting with a vendor.'
        />
      ) : (
        <div className="mt-4 grid min-h-[60vh] grid-cols-1 overflow-hidden rounded-lg border border-border md:grid-cols-[320px_1fr]">
          <aside
            className={`min-h-0 overflow-y-auto border-border p-2 md:border-r ${
              conversationId ? 'hidden md:block' : ''
            }`}
            aria-label="Conversations"
          >
            {convos.map((c) => (
              <ConversationRow key={c._id} convo={c} meId={user._id} active={c._id === conversationId} />
            ))}
          </aside>
          <section className={`min-h-0 ${conversationId ? '' : 'hidden md:flex md:items-center md:justify-center'}`}>
            {conversationId ? (
              <Thread conversationId={conversationId} meId={user._id} />
            ) : (
              <p className="p-10 text-sm text-muted-foreground">Select a conversation to start chatting.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
