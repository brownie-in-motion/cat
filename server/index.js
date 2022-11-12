import 'dotenv/config'
import path from 'path'
import crypto from 'crypto'
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

const getToken = (id) => {
    const idBuf = Buffer.from(id, 'base64url')
    const hmac = crypto
        .createHmac('sha256', process.env.APP_SECRET)
        .update(idBuf)
        .digest()
    return Buffer.concat([hmac, idBuf]).toString('base64url')
}

const validateToken = (token) => {
    const tokenBuf = Buffer.from(token, 'base64url')
    const tokenHmac = tokenBuf.subarray(0, 32)
    const id = tokenBuf.subarray(32)
    const hmac = crypto
        .createHmac('sha256', process.env.APP_SECRET)
        .update(id)
        .digest()
    if (tokenHmac.length !== hmac.length || !crypto.timingSafeEqual(tokenHmac, hmac)) {
        return
    }
    return id.toString('base64url')
}

fastify.get('/:token', (_req, reply) => {
    reply.sendFile('index.html', path.resolve('./public'))
})

fastify.post('/start', async (_req, res) => {
    const id = manager.createConnection()
    res.send({ token: getToken(id) })
})

fastify.get('/connect/:token', { websocket: true }, (conn, req) => {
    const id = validateToken(req.params.token)
    const writeInit = init => conn.write(JSON.stringify(init))
    if (!id) {
        writeInit({ ok: false })
        conn.end()
        return
    }
    const pipe = manager.getConnection(id)
    if (!pipe) {
        writeInit({ ok: false })
        conn.end()
        return
    }
    writeInit({ ok: true, id, port: TCP_PORT })

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
