import { randomUUID } from 'node:crypto'
import {
    deleteTransactionRecord,
    findTransactions,
    insertTransaction,
    updateTransactionRecord,
} from '../data/repository.js'

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

export async function listTransactions(clientId) {
    const normalizedClientId = normalizeClientId(clientId)
    return findTransactions(normalizedClientId)
}

export async function createTransaction(clientId, input) {
    const transaction = {
        id: randomUUID(),
        clientId: normalizeClientId(clientId),
        ...validateTransaction(input),
    }

    return insertTransaction(transaction)
}

export async function updateTransaction(
    clientId,
    transactionId,
    input,
) {
    const normalizedClientId = normalizeClientId(clientId)
    const transactions = await findTransactions(normalizedClientId)
    const currentTransaction = transactions.find(
        function findTransaction(transaction) {
            return transaction.id === transactionId
        },
    )

    if (!currentTransaction) {
        return null
    }

    const validatedTransaction = validateTransaction({
            ...currentTransaction,
            ...input,
    })

    return updateTransactionRecord(
        normalizedClientId,
        transactionId,
        validatedTransaction,
    )
}

export async function deleteTransaction(clientId, transactionId) {
    const normalizedClientId = normalizeClientId(clientId)
    return deleteTransactionRecord(normalizedClientId, transactionId)
}
