import net from 'net'
import { EventEmitter } from 'events'
import crypto from 'crypto'

class Connection extends EventEmitter {
    timestamp = Date.now()

    constructor(id, token) {
        super()

        this._token = token
        this._id = id
        this._ready = new Promise((resolve) => {
            this.resolve = resolve
        })
        this._initialized = false
        this._send = () => { throw new Error('not initialized') }
    }

    ready() { return this._ready }
    initialized() { return this._initialized }
    id() { return this._id }
    checkToken(token) { return this._token === token }
    send(data) { this._send(data); this.keepAlive() }

    // called by manager
    initialize(send) {
        this.resolve()
        this._initialized = true
        this._send = send
    }

    keepAlive() {
        this.timestamp = Date.now()
    }
}

export default class ConnectionManager {
    // id => connection
    connections = new Map()

    constructor() {
        this._ready = false
    }

    createConnection() {
        if (!this._ready) throw new Error('not ready')
        let idBuf
        let id
        do {
            idBuf = crypto.randomBytes(6)
            id = idBuf.toString('base64url')
        } while (id.startsWith('-'))
        const token = Buffer
            .concat([idBuf, crypto.randomBytes(6)])
            .toString('base64url')
        const connection = new Connection(id, token)
        this.connections.set(id, connection)
        return token
    }


    getConnection(token) {
        if (!this._ready) throw new Error('not ready')
        const tokenBuf = Buffer.from(token ?? '', 'base64url')
        const id = tokenBuf.subarray(0, 6).toString('base64url')
        const conn = this.connections.get(id)
        if (!conn?.checkToken(token)) return
        return conn
    }

    purge(timeout) {
        const now = Date.now()
        for (const [id, connection] of this.connections) {
            if (now - connection.timestamp > timeout) {
                this.connections.delete(id)
            }
        }
    }

    start(port) {
        const server = net.createServer((connection) => {
            const state = {
                header: Buffer.alloc(8),
                id: void 0,
                read: 0,
            }
            connection.on('data', (data) => {
                if (state.read < state.header.length) {
                    const prefix = data.subarray(0, 8 - state.read)
                    prefix.copy(state.header, state.read)
                    state.read += prefix.length

                    if (state.read === state.header.length) {
                        state.id = state.header.toString()

                        // if we do not have a waiting connection then discard
                        if (!this.connections.has(state.id)) {
                            connection.destroy()
                            return
                        }

                        const pipe = this.connections.get(state.id)

                        // if the connection is already initialized, discard
                        if (pipe.initialized()) {
                            connection.destroy()
                            return
                        }

                        // initialize the connection
                        pipe.initialize((data) => {
                            connection.write(data)
                        })

                        // give remaining data to emitter
                        const remaining = data.subarray(prefix.length)
                        if (remaining.length) pipe.emit('data', remaining)
                    }
                } else {
                    // if the connection is gone, then discard
                    if (!this.connections.has(state.id)) {
                        connection.destroy()
                        return
                    }

                    // otherwise, give data to connection
                    const pipe = this.connections.get(state.id)
                    pipe.emit('data', data)
                    pipe.keepAlive()
                }
            })
        })

        return new Promise((resolve) => server.listen(port, () => {
            this._ready = true
            resolve()
        }))
    }
}
