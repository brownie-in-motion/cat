import { useEffect, useRef, useCallback } from 'preact/hooks'
import { route } from 'preact-router'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useSession } from './session'
import { Control } from './control'
import './term.css'

const Term = ({ token }) => {
  const termEl = useRef()
  const term = useRef()
  const handleMessage = useCallback((msg) => {
    term.current?.write(msg)
  }, [])
  const [init, sendMessage] = useSession(token, handleMessage)
  const handleTty = useCallback(() => {
    sendMessage(
      'SHELL=$0 script -q /dev/null -c ' +
      `'stty rows ${term.current.rows} cols ${term.current.cols};exec $0'\n`
    )
  }, [sendMessage])
  useEffect(() => {
    term.current = new Terminal({ convertEol: true })
    const fitAddon = new FitAddon()
    term.current.loadAddon(fitAddon)
    term.current.open(termEl.current)
    fitAddon.fit()
    term.current.onData(sendMessage)
    return () => term.current.dispose()
  }, [sendMessage])
  useEffect(() => {
    if (init && token !== init.token) {
      route(`/${init.token}`, true)
    }
  }, [init])
  return (
    <div class="container">
      <Control
        onTty={handleTty}
        port={init?.port}
        id={init?.id}
        hostname={location.hostname}
      />
      <div class="term" ref={termEl} />
    </div>
  )
}

export { Term }
