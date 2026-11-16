import express from 'express'
import { requireClientContext } from '../middleware/clientContext.js'
import {
    createRecurringRule,
    generateDueTransactions,
    listRecurringRules,
} from '../services/recurringRuleService.js'
import { ValidationError } from '../services/transactionService.js'

export const recurringRuleRouter = express.Router()

recurringRuleRouter.use(requireClientContext)

recurringRuleRouter.get('/', (request, response) => {
    response.json({
        recurringRules: listRecurringRules(request.clientId),
    })
})

recurringRuleRouter.post('/', (request, response) => {
    try {
        const recurringRule = createRecurringRule(
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

recurringRuleRouter.post('/generate', (request, response) => {
    try {
        const result = generateDueTransactions(
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
