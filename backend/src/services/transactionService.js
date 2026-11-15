import { randomUUID } from 'node:crypto'
import { store } from '../data/store.js'

export class ValidationError extends Error {}

function normalizeClientId(clientId) {
    return clientId.toString()
}

function validateTransaction(input) {
    if (!['income', 'expense'].includes(input.type)) {
        throw new ValidationError(
            'Operacijos tipas turi būti income arba expense',
        )
    }

    if (
        !Number.isInteger(input.amountCents) ||
        input.amountCents <= 0
    ) {
        throw new ValidationError(
            'Suma turi būti teigiamas sveikas centų skaičius',
        )
    }

    if (
        typeof input.category !== 'string' ||
        input.category.trim() === ''
    ) {
        throw new ValidationError('Kategorija yra privaloma')
    }

    const date = new Date(input.date)

    if (Number.isNaN(date.getTime())) {
        throw new ValidationError('Operacijos data yra netinkama')
    }

    return {
        type: input.type,
        amountCents: input.amountCents,
        category: input.category.trim(),
        description:
            typeof input.description === 'string'
                ? input.description.trim()
                : '',
        date: date.toISOString(),
    }
}

export function listTransactions(clientId) {
    const normalizedClientId = normalizeClientId(clientId)

    return store.transactions.filter(
        (transaction) =>
            transaction.clientId === normalizedClientId,
    )
}

export function createTransaction(clientId, input) {
    const transaction = {
        id: randomUUID(),
        clientId: normalizeClientId(clientId),
        ...validateTransaction(input),
    }

    store.transactions.push(transaction)

    return transaction
}

export function updateTransaction(
    clientId,
    transactionId,
    input,
) {
    const normalizedClientId = normalizeClientId(clientId)

    const transactionIndex = store.transactions.findIndex(
        (transaction) =>
            transaction.id === transactionId &&
            transaction.clientId === normalizedClientId,
    )

    if (transactionIndex === -1) {
        return null
    }

    const currentTransaction =
        store.transactions[transactionIndex]

    const updatedTransaction = {
        ...currentTransaction,
        ...validateTransaction({
            ...currentTransaction,
            ...input,
        }),
    }

    store.transactions[transactionIndex] =
        updatedTransaction

    return updatedTransaction
}