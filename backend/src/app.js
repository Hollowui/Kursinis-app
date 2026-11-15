import cors from 'cors'
import express from 'express'
import { store } from './data/store.js'
import { transactionRouter } from './routes/transactionRoutes.js'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (request, response) => {
    response.json({
        status: 'ok',
        message: 'Budget Tracker API veikia',
    })
})

app.get('/api/clients', (request, response) => {
    response.json({
        clients: store.clients,
    })
})

app.use('/api/transactions', transactionRouter)

app.use((error, request, response, next) => {
    console.error(error)

    response.status(500).json({
        error: 'Vidinė serverio klaida',
    })
})