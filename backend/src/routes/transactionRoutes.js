import express from 'express'
import { requireClientContext } from '../middleware/clientContext.js'
import {
    createTransaction,
    deleteTransaction,
    listTransactions,
    updateTransaction,
    ValidationError,
} from '../services/transactionService.js'

export const transactionRouter = express.Router()

transactionRouter.use(requireClientContext)

transactionRouter.get('/', (request, response) => {
    const transactions = listTransactions(
        request.clientId,
    )

    response.json({ transactions })
})

transactionRouter.post('/', (request, response) => {
    try {
        const transaction = createTransaction(
            request.clientId,
            request.body,
        )

        response.status(201).json({ transaction })
    } catch (error) {
        if (error instanceof ValidationError) {
            return response.status(400).json({
                error: error.message,
            })
        }

        throw error
    }
})

transactionRouter.patch(
    '/:transactionId',
    (request, response) => {
        try {
            const transaction = updateTransaction(
                request.clientId,
                request.params.transactionId,
                request.body,
            )

            if (!transaction) {
                return response.status(404).json({
                    error: 'Operacija nerasta',
                })
            }

            response.json({ transaction })
        } catch (error) {
            if (error instanceof ValidationError) {
                return response.status(400).json({
                    error: error.message,
                })
            }

            throw error
        }
    },
)
transactionRouter.delete(
    '/:transactionId',
    (request, response) => {
        const deleted = deleteTransaction(
            request.clientId,
            request.params.transactionId,
        )

        if (!deleted) {
            return response.status(404).json({
                error: 'Operacija nerasta',
            })
        }

        response.status(204).send()
    },
)