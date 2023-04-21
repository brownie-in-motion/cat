import path from 'path'
import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import ConnectionManager from './manager.js'

const WEB_PORT = 3000
const TCP_PORT = 3001

const manager = new ConnectionManager()
const fastify = Fastify({ logger: true })
await fastify.register(fastifyWebsocket)
await fastify.register(fastifyStatic, {
    root: path.resolve('./dist'),
    prefix: '/assets',
})

fastify.get('/:token', (_req, reply) => {
    reply.sendFile('index.html', path.resolve('./public'))
})

fastify.get('/connect/:token', { websocket: true }, (conn, req) => {
    let token = req.params.token
    let pipe = manager.getConnection(token)
    if (!pipe) {
        token = manager.createConnection()
        pipe = manager.getConnection(token)
    }
    conn.write(JSON.stringify({ id: pipe.id(), token, port: TCP_PORT }))

    conn.socket.on('message', async (data) => {
        await pipe.ready()
        pipe.send(data)
    })
    pipe.on('data', (data) => {
        conn.socket.send(data)
    })
    const chunks = pipe.chunks()
    if (chunks.length > 0) {
        conn.socket.send(Buffer.concat(chunks))
    }
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
