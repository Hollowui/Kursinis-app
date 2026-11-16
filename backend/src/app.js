import cors from 'cors'
import express from 'express'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getClients } from './data/repository.js'
import { recurringRuleRouter } from './routes/recurringRuleRoutes.js'
import { transactionRouter } from './routes/transactionRoutes.js'

export const app = express()
const frontendDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../frontend/dist',
)

app.use(cors())
app.use(express.json())

app.get('/api/health', (request, response) => {
    response.json({
        status: 'ok',
        message: 'Budget Tracker API veikia',
    })
})

app.get('/api/clients', async function getClientList(request, response) {
    response.json({
        clients: await getClients(),
    })
})

app.use('/api/transactions', transactionRouter)
app.use('/api/recurring-rules', recurringRuleRouter)

app.use(express.static(frontendDirectory))

app.use((request, response, next) => {
    if (
        request.method !== 'GET' ||
        request.path.startsWith('/api/')
    ) {
        return next()
    }

    response.sendFile(
        resolve(frontendDirectory, 'index.html'),
        (error) => {
            if (error) next(error)
        },
    )
})

app.use((error, request, response, next) => {
    console.error(error)

    response.status(500).json({
        error: 'Vidinė serverio klaida',
    })
})
