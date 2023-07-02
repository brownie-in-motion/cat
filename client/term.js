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
            'script -q /dev/null -c ' +
                `"stty rows ${term.current.rows} cols ${term.current.cols};exec /bin/bash"\n`
        )
    }, [sendMessage])
    useEffect(() => {
        term.current = new Terminal({
            fontFamily: 'monospace',
            convertEol: true,
        })
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
    useEffect(() => {
        const text = [
            'got a #? want iteractivity?',
            'no need to spin up a server!',
            '1. send the command above',
            '2. start a tty with the button',
            '3. share the uri to collaborate',
        ]
        const max = Math.max(...text.map((s) => s.length))
        const border = `+-${'-'.repeat(max)}-+`
        term.current?.write(
            [
                border,
                ...text.map((line) => `| ${line.padEnd(max, ' ')} |`),
                border,
                '',
            ].join('\n') + '\n'
        )
    }, [])
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
