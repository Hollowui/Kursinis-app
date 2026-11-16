import request from 'supertest'
import { beforeEach, describe, expect, test } from 'vitest'
import { app } from './app.js'
import {
    CLIENT_A_ID,
    CLIENT_B_ID,
    resetStore,
} from './data/store.js'

describe('klientų duomenų izoliacija', function () {
    beforeEach(function () {
        resetStore()
    })

    test('atmeta užklausą be kliento konteksto', async function () {
        const response = await request(app)
            .get('/api/transactions')
            .expect(400)

        expect(response.body.error).toBe(
            'Trūksta x-client-id antraštės',
        )
    })

    test('klientui grąžina tik jo operacijas', async function () {
        const response = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_A_ID)
            .expect(200)

        expect(response.body.transactions.length).toBe(1)
        expect(response.body.transactions[0].clientId).toBe(
            CLIENT_A_ID,
        )
    })

    test('neleidžia klientui pakeisti kito kliento operacijos', async function () {
        await request(app)
            .patch('/api/transactions/transaction-b-1')
            .set('x-client-id', CLIENT_A_ID)
            .send({
                amountCents: 999999,
            })
            .expect(404)

        const clientBResponse = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_B_ID)
            .expect(200)

        expect(
            clientBResponse.body.transactions[0].amountCents,
        ).toBe(2500)
    })

    test('kliento ID ima iš antraštės, o ne užklausos body', async function () {
        const response = await request(app)
            .post('/api/transactions')
            .set('x-client-id', CLIENT_A_ID)
            .send({
                clientId: CLIENT_B_ID,
                type: 'income',
                amountCents: 120000,
                category: 'Atlyginimas',
                description: 'Lapkričio atlyginimas',
                date: '2026-11-10',
            })
            .expect(201)

        expect(response.body.transaction.clientId).toBe(
            CLIENT_A_ID,
        )
    })

    test('įvykdo periodinės operacijos scenarijų per API', async function () {
        const createResponse = await request(app)
            .post('/api/recurring-rules')
            .set('x-client-id', CLIENT_A_ID)
            .send({
                type: 'expense',
                amountCents: 1999,
                category: 'Prenumeratos',
                description: 'Muzika',
                frequency: 'monthly',
                startDate: '2026-10-31',
            })
            .expect(201)

        await request(app)
            .post('/api/recurring-rules/generate')
            .set('x-client-id', CLIENT_A_ID)
            .send({ throughDate: '2026-11-30' })
            .expect(200)

        const transactionsResponse = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_A_ID)
            .expect(200)

        expect(createResponse.body.recurringRule.nextOccurrenceDate)
            .toBe('2026-10-31')
        const recurringTransactions =
            transactionsResponse.body.transactions.filter(
                function (transaction) {
                    return transaction.recurringRuleId ===
                        createResponse.body.recurringRule.id
                },
            )

        const occurrenceDates = recurringTransactions.map(
            function (transaction) {
                return transaction.occurrenceDate
            },
        )

        expect(occurrenceDates).toEqual([
            '2026-11-30',
            '2026-10-31',
        ])
    })

    test('leidžia ištrinti tik savo kliento operaciją', async function () {
        await request(app)
            .delete('/api/transactions/transaction-b-1')
            .set('x-client-id', CLIENT_A_ID)
            .expect(404)

        await request(app)
            .delete('/api/transactions/transaction-a-1')
            .set('x-client-id', CLIENT_A_ID)
            .expect(204)

        const clientAResponse = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_A_ID)
            .expect(200)

        const clientBResponse = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_B_ID)
            .expect(200)

        expect(clientAResponse.body.transactions.length).toBe(0)
        expect(clientBResponse.body.transactions.length).toBe(1)
    })

    test('masiškai ištrina tik aktyvaus kliento operacijas', async function () {
        const deleteResponse = await request(app)
            .delete('/api/transactions/bulk')
            .set('x-client-id', CLIENT_A_ID)
            .send({
                transactionIds: [
                    'transaction-a-1',
                    'transaction-b-1',
                ],
            })
            .expect(200)

        expect(deleteResponse.body.deletedCount).toBe(1)

        const clientAResponse = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_A_ID)
            .expect(200)

        const clientBResponse = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_B_ID)
            .expect(200)

        expect(clientAResponse.body.transactions.length).toBe(0)
        expect(clientBResponse.body.transactions.length).toBe(1)
    })

    test('ištrina visas pasirinktos taisyklės operacijas', async function () {
        const createResponse = await request(app)
            .post('/api/recurring-rules')
            .set('x-client-id', CLIENT_A_ID)
            .send({
                type: 'expense',
                amountCents: 1999,
                category: 'Prenumeratos',
                description: 'Muzika',
                frequency: 'monthly',
                startDate: '2026-10-31',
            })
            .expect(201)

        const ruleId = createResponse.body.recurringRule.id

        await request(app)
            .post('/api/recurring-rules/generate')
            .set('x-client-id', CLIENT_A_ID)
            .send({ throughDate: '2026-11-30' })
            .expect(200)

        const deleteResponse = await request(app)
            .delete('/api/recurring-rules/' + ruleId + '/transactions')
            .set('x-client-id', CLIENT_A_ID)
            .expect(200)

        expect(deleteResponse.body.deletedCount).toBe(2)

        const transactionsResponse = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_A_ID)
            .expect(200)

        const ruleTransactions =
            transactionsResponse.body.transactions.filter(
                function findRuleTransaction(transaction) {
                    return transaction.recurringRuleId === ruleId
                },
            )

        expect(ruleTransactions.length).toBe(0)

        const regenerateResponse = await request(app)
            .post('/api/recurring-rules/generate')
            .set('x-client-id', CLIENT_A_ID)
            .send({ throughDate: '2026-11-30' })
            .expect(200)

        expect(regenerateResponse.body.generatedTransactions.length).toBe(2)
    })

    test('leidžia ištrinti tik savo periodinę taisyklę', async function () {
        const clientARuleResponse = await request(app)
            .post('/api/recurring-rules')
            .set('x-client-id', CLIENT_A_ID)
            .send({
                type: 'expense',
                amountCents: 1999,
                category: 'Prenumeratos',
                frequency: 'monthly',
                startDate: '2026-11-01',
            })
            .expect(201)

        const clientBRuleResponse = await request(app)
            .post('/api/recurring-rules')
            .set('x-client-id', CLIENT_B_ID)
            .send({
                type: 'income',
                amountCents: 5000,
                category: 'Papildomos pajamos',
                frequency: 'monthly',
                startDate: '2026-11-01',
            })
            .expect(201)

        const clientARuleId =
            clientARuleResponse.body.recurringRule.id
        const clientBRuleId =
            clientBRuleResponse.body.recurringRule.id

        await request(app)
            .delete('/api/recurring-rules/' + clientBRuleId)
            .set('x-client-id', CLIENT_A_ID)
            .expect(404)

        await request(app)
            .delete('/api/recurring-rules/' + clientARuleId)
            .set('x-client-id', CLIENT_A_ID)
            .expect(204)

        const clientARulesResponse = await request(app)
            .get('/api/recurring-rules')
            .set('x-client-id', CLIENT_A_ID)
            .expect(200)

        const clientBRulesResponse = await request(app)
            .get('/api/recurring-rules')
            .set('x-client-id', CLIENT_B_ID)
            .expect(200)

        expect(clientARulesResponse.body.recurringRules.length).toBe(0)
        expect(clientBRulesResponse.body.recurringRules.length).toBe(1)
    })
})
