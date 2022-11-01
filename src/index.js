import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import ConnectionManager from './manager.js'

const WEB_PORT = 3000
const TCP_PORT = 3001

const manager = new ConnectionManager()
const fastify = Fastify({ logger: true })
await fastify.register(websocket)

fastify.post('/start', async (_req, res) => {
    const id = manager.createConnection()
    res.send({ id, port: TCP_PORT })
})

fastify.get('/connect/:id', { websocket: true }, (conn, req) => {
    const id = req.params.id
    const pipe = manager.getConnection(id)

    conn.socket.on('message', async (data) => {
        await pipe.ready()
        pipe.send(data)
    })

    pipe.on('data', (data) => {
        conn.socket.send(data)
    })
})

try {
    await manager.start(TCP_PORT)
    fastify.log.info(`socket server listening on ${TCP_PORT}`)

    await fastify.listen({ host: '0.0.0.0', port: WEB_PORT })
} catch (err) {
    fastify.log.error(err)
    process.exit(1)
}

setInterval(() => {
    manager.purge(1000 * 60 * 5)
}, 1000 * 60)
