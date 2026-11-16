import { beforeEach, describe, expect, it } from 'vitest'
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

describe('recurringRuleService', () => {
    beforeEach(() => {
        resetStore()
    })

    it('sukuria taisyklę ir sugeneruoja atėjusias operacijas', () => {
        const rule = createRecurringRule(CLIENT_A_ID, MONTHLY_RULE)

        const result = generateDueTransactions(
            CLIENT_A_ID,
            '2027-03-31',
        )

        expect(result.generatedTransactions.map(
            (transaction) => transaction.occurrenceDate,
        )).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
        expect(rule.nextOccurrenceDate).toBe('2027-04-30')
    })

    it('pakartotinai negeneruoja tos pačios taisyklės ir datos', () => {
        const rule = createRecurringRule(CLIENT_A_ID, MONTHLY_RULE)

        generateDueTransactions(CLIENT_A_ID, '2027-01-31')
        rule.nextOccurrenceDate = '2027-01-31'

        const result = generateDueTransactions(
            CLIENT_A_ID,
            '2027-01-31',
        )

        expect(result.generatedTransactions).toHaveLength(0)
        expect(result.skippedDuplicates).toBe(1)
        expect(
            store.transactions.filter(
                (transaction) => transaction.recurringRuleId === rule.id,
            ),
        ).toHaveLength(1)
    })

    it('atmeta netinkamą taisyklę', () => {
        expect(() => createRecurringRule(CLIENT_A_ID, {
            ...MONTHLY_RULE,
            amountCents: 0,
        })).toThrow('Suma turi būti teigiamas sveikas centų skaičius')
    })

    it('nekuria operacijų po taisyklės pabaigos datos', () => {
        createRecurringRule(CLIENT_A_ID, {
            ...MONTHLY_RULE,
            endDate: '2027-02-28',
        })

        const result = generateDueTransactions(
            CLIENT_A_ID,
            '2027-03-31',
        )

        expect(result.generatedTransactions).toHaveLength(2)
    })

    it('izoliuoja skirtingų klientų taisykles ir generavimą', () => {
        createRecurringRule(CLIENT_A_ID, MONTHLY_RULE)
        createRecurringRule(CLIENT_B_ID, {
            ...MONTHLY_RULE,
            category: 'Transportas',
        })

        const result = generateDueTransactions(
            CLIENT_A_ID,
            '2027-01-31',
        )

        expect(result.generatedTransactions).toHaveLength(1)
        expect(result.generatedTransactions[0].clientId).toBe(CLIENT_A_ID)
        expect(listRecurringRules(CLIENT_A_ID)).toHaveLength(1)
        expect(listRecurringRules(CLIENT_B_ID)).toHaveLength(1)
    })
})
