import express from 'express'
import { requireClientContext } from '../middleware/clientContext.js'
import {
    createTransaction,
    deleteTransaction,
    deleteTransactions,
    listTransactions,
    updateTransaction,
    ValidationError,
} from '../services/transactionService.js'

export const transactionRouter = express.Router()

transactionRouter.use(requireClientContext)

transactionRouter.get('/', async function getTransactions(request, response) {
    const transactions = await listTransactions(
        request.clientId,
    )

    response.json({ transactions })
})

transactionRouter.post('/', async function postTransaction(request, response) {
    try {
        const transaction = await createTransaction(
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
    async function patchTransaction(request, response) {
        try {
            const transaction = await updateTransaction(
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
    '/bulk',
    async function removeTransactions(request, response) {
        try {
            const deletedCount = await deleteTransactions(
                request.clientId,
                request.body.transactionIds,
            )

            response.json({ deletedCount: deletedCount })
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
    async function removeTransaction(request, response) {
        const deleted = await deleteTransaction(
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
