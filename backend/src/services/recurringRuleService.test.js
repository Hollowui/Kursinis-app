import { beforeEach, describe, expect, test } from 'vitest'
import {
    CLIENT_A_ID,
    CLIENT_B_ID,
    resetStore,
    store,
} from '../data/store.js'
import {
    createRecurringRule,
    generateDueTransactions,
    listRecurringRules,
} from './recurringRuleService.js'

const MONTHLY_RULE = {
    type: 'expense',
    amountCents: 65000,
    category: 'Būstas',
    description: 'Nuoma',
    frequency: 'monthly',
    startDate: '2027-01-31',
}

describe('recurringRuleService', function () {
    beforeEach(function () {
        resetStore()
    })

    test('sukuria taisyklę ir sugeneruoja atėjusias operacijas', async function () {
        const rule = await createRecurringRule(CLIENT_A_ID, MONTHLY_RULE)

        const result = await generateDueTransactions(
            CLIENT_A_ID,
            '2027-03-31',
        )

        const occurrenceDates = result.generatedTransactions.map(
            function (transaction) {
                return transaction.occurrenceDate
            },
        )

        expect(occurrenceDates).toEqual([
            '2027-01-31',
            '2027-02-28',
            '2027-03-31',
        ])
        expect(rule.nextOccurrenceDate).toBe('2027-04-30')
    })

    test('pakartotinai negeneruoja tos pačios taisyklės ir datos', async function () {
        const rule = await createRecurringRule(CLIENT_A_ID, MONTHLY_RULE)

        await generateDueTransactions(CLIENT_A_ID, '2027-01-31')
        rule.nextOccurrenceDate = '2027-01-31'

        const result = await generateDueTransactions(
            CLIENT_A_ID,
            '2027-01-31',
        )

        expect(result.generatedTransactions.length).toBe(0)
        expect(result.skippedDuplicates).toBe(1)

        const ruleTransactions = store.transactions.filter(
            function (transaction) {
                return transaction.recurringRuleId === rule.id
            },
        )

        expect(ruleTransactions.length).toBe(1)
    })

    test('atmeta netinkamą taisyklę', async function () {
        const invalidRule = {
            ...MONTHLY_RULE,
            amountCents: 0,
        }

        await expect(
            createRecurringRule(CLIENT_A_ID, invalidRule),
        ).rejects.toThrow(
            'Suma turi būti teigiamas sveikas centų skaičius',
        )
    })

    test('nekuria operacijų po taisyklės pabaigos datos', async function () {
        const ruleWithEndDate = {
            ...MONTHLY_RULE,
            endDate: '2027-02-28',
        }

        await createRecurringRule(CLIENT_A_ID, ruleWithEndDate)

        const result = await generateDueTransactions(
            CLIENT_A_ID,
            '2027-03-31',
        )

        expect(result.generatedTransactions.length).toBe(2)
    })

    test('izoliuoja skirtingų klientų taisykles ir generavimą', async function () {
        await createRecurringRule(CLIENT_A_ID, MONTHLY_RULE)

        const clientBRule = {
            ...MONTHLY_RULE,
            category: 'Transportas',
        }

        await createRecurringRule(CLIENT_B_ID, clientBRule)

        const result = await generateDueTransactions(
            CLIENT_A_ID,
            '2027-01-31',
        )

        const clientARules = await listRecurringRules(CLIENT_A_ID)
        const clientBRules = await listRecurringRules(CLIENT_B_ID)

        expect(result.generatedTransactions.length).toBe(1)
        expect(result.generatedTransactions[0].clientId).toBe(CLIENT_A_ID)
        expect(clientARules.length).toBe(1)
        expect(clientBRules.length).toBe(1)
    })
})
