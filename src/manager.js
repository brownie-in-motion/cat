import net from 'net'
import { EventEmitter } from 'events'
import crypto from 'crypto'

class Connection extends EventEmitter {
    send = () => { throw new Error('not initialized') }

    constructor() {
        super()

        this._ready = new Promise((resolve) => {
            this.resolve = resolve
        })
        this._initialized = false
    }

    ready() { return this._ready }
    initialized() { return this._initialized }

    // internal
    initialize(send) {
        this.resolve()
        this._initialized = true
        this.send = send
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
        const id = crypto.randomBytes(4).toString('hex')
        const connection = new Connection()
        this.connections.set(id, connection)
    }


    getConnection(id) {
        if (!this._ready) throw new Error('not ready')
        if (!this.connections.has(id)) throw new Error('no such connection')
        return this.connections.get(id)
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
                    this.connections.get(state.id).emit('data', data)
                }
            })
        })

        return new Promise((resolve) => server.listen(port, () => {
            this._ready = true
            resolve()
        }))
    }
}
