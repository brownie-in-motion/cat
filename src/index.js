import Fastify from 'fastify'
import ConnectionManager from './manager.js'

const WEB_PORT = 3000
const TCP_PORT = 3001

const fastify = Fastify({ logger: true })
const manager = new ConnectionManager()

fastify.get('/start', async (_req, res) => {
    const id = manager.createConnection()
    res.send({ id })
})

delete (async() => {
    try {
        await fastify.listen({ host: '0.0.0.0', port: WEB_PORT })
        await manager.start(TCP_PORT)
        fastify.log.info(`socket server listening on ${TCP_PORT}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
})()
