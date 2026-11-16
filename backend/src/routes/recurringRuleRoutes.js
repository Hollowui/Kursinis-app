import express from 'express'
import { requireClientContext } from '../middleware/clientContext.js'
import {
    createRecurringRule,
    deleteRecurringRule,
    deleteRecurringRuleTransactions,
    generateDueTransactions,
    listRecurringRules,
} from '../services/recurringRuleService.js'
import { ValidationError } from '../services/transactionService.js'

export const recurringRuleRouter = express.Router()

recurringRuleRouter.use(requireClientContext)

recurringRuleRouter.get('/', async function getRules(request, response) {
    response.json({
        recurringRules: await listRecurringRules(request.clientId),
    })
})

recurringRuleRouter.post('/', async function postRule(request, response) {
    try {
        const recurringRule = await createRecurringRule(
            request.clientId,
            request.body,
        )

        response.status(201).json({ recurringRule })
    } catch (error) {
        if (error instanceof ValidationError) {
            return response.status(400).json({ error: error.message })
        }

        throw error
    }
})

recurringRuleRouter.post('/generate', async function generateRules(request, response) {
    try {
        const result = await generateDueTransactions(
            request.clientId,
            request.body.throughDate,
        )

        response.json(result)
    } catch (error) {
        if (error instanceof ValidationError) {
            return response.status(400).json({ error: error.message })
        }

        throw error
    }
})

recurringRuleRouter.delete(
    '/:ruleId/transactions',
    async function removeRuleTransactions(request, response) {
        const deletedCount = await deleteRecurringRuleTransactions(
            request.clientId,
            request.params.ruleId,
        )

        if (deletedCount === null) {
            return response.status(404).json({
                error: 'Periodinė taisyklė nerasta',
            })
        }

        response.json({ deletedCount: deletedCount })
    },
)

recurringRuleRouter.delete(
    '/:ruleId',
    async function removeRule(request, response) {
        const deleted = await deleteRecurringRule(
            request.clientId,
            request.params.ruleId,
        )

        if (!deleted) {
            return response.status(404).json({
                error: 'Periodinė taisyklė nerasta',
            })
        }

        response.status(204).send()
    },
)
