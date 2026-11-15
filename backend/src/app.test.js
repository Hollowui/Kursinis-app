import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from './app.js'
import {
    CLIENT_A_ID,
    CLIENT_B_ID,
    resetStore,
} from './data/store.js'

describe('klientų duomenų izoliacija', () => {
    beforeEach(() => {
        resetStore()
    })

    it('atmeta užklausą be kliento konteksto', async () => {
        const response = await request(app)
            .get('/api/transactions')
            .expect(400)

        expect(response.body.error).toBe(
            'Trūksta x-client-id antraštės',
        )
    })

    it('klientui grąžina tik jo operacijas', async () => {
        const response = await request(app)
            .get('/api/transactions')
            .set('x-client-id', CLIENT_A_ID)
            .expect(200)

        expect(response.body.transactions).toHaveLength(1)

        expect(
            response.body.transactions.every(
                (transaction) =>
                    transaction.clientId === CLIENT_A_ID,
            ),
        ).toBe(true)
    })

    it('neleidžia klientui pakeisti kito kliento operacijos', async () => {
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

    it('kliento ID ima iš antraštės, o ne užklausos body', async () => {
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
})