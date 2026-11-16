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
