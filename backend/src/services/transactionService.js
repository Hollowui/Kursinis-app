import { randomUUID } from 'node:crypto'
import {
    deleteTransactionRecord,
    deleteTransactionRecords,
    findTransactions,
    insertTransaction,
    updateTransactionRecord,
} from '../data/repository.js'

export class ValidationError extends Error {}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

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

    const dateMatch = typeof input.date === 'string'
        ? DATE_ONLY_PATTERN.exec(input.date)
        : null

    if (!dateMatch) {
        throw new ValidationError('Operacijos data yra netinkama')
    }

    const year = Number(dateMatch[1])
    const month = Number(dateMatch[2])
    const day = Number(dateMatch[3])
    const date = new Date(Date.UTC(year, month - 1, day))

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
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
        date: currentTransaction.date.slice(0, 10),
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

export async function deleteTransactions(clientId, transactionIds) {
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        throw new ValidationError(
            'Pasirinkite bent vieną operaciją',
        )
    }

    if (transactionIds.length > 500) {
        throw new ValidationError(
            'Vienu metu galima ištrinti iki 500 operacijų',
        )
    }

    const uniqueIds = Array.from(new Set(transactionIds))
    const normalizedClientId = normalizeClientId(clientId)

    return deleteTransactionRecords(normalizedClientId, uniqueIds)
}
