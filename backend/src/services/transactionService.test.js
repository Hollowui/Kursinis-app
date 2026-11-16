import { beforeEach, describe, expect, test } from 'vitest'
import {
    CLIENT_A_ID,
    resetStore,
} from '../data/store.js'
import {
    createTransaction,
    listTransactions,
    updateTransaction,
} from './transactionService.js'

describe('transactionService', function () {
    beforeEach(function () {
        resetStore()
    })

    test('atmeta neegzistuojančią kalendoriaus datą', async function () {
        await expect(
            createTransaction(CLIENT_A_ID, {
                type: 'expense',
                amountCents: 1000,
                category: 'Testas',
                date: '2026-02-30',
            }),
        ).rejects.toThrow('Operacijos data yra netinkama')
    })

    test('priima teisingą keliamųjų metų datą', async function () {
        const transaction = await createTransaction(
            CLIENT_A_ID,
            {
                type: 'expense',
                amountCents: 1000,
                category: 'Testas',
                date: '2028-02-29',
            },
        )

        expect(transaction.date).toBe('2028-02-29T00:00:00.000Z')
    })

    test('operacijas grąžina nuo naujausios datos', async function () {
        await createTransaction(CLIENT_A_ID, {
            type: 'expense',
            amountCents: 1000,
            category: 'Ankstesnė',
            date: '2026-10-01',
        })

        await createTransaction(CLIENT_A_ID, {
            type: 'income',
            amountCents: 2000,
            category: 'Naujausia',
            date: '2026-12-01',
        })

        const transactions = await listTransactions(CLIENT_A_ID)

        expect(transactions[0].category).toBe('Naujausia')
        expect(transactions[transactions.length - 1].category)
            .toBe('Ankstesnė')
    })

    test('leidžia dalinai atnaujinti operaciją be datos', async function () {
        const transactions = await listTransactions(CLIENT_A_ID)
        const transaction = transactions[0]

        const updatedTransaction = await updateTransaction(
            CLIENT_A_ID,
            transaction.id,
            { description: 'Atnaujintas aprašymas' },
        )

        expect(updatedTransaction.description)
            .toBe('Atnaujintas aprašymas')
        expect(updatedTransaction.date)
            .toBe(transaction.date)
    })
})
