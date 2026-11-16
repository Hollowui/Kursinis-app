import mongoose from 'mongoose'
import { Client } from '../models/Client.js'
import { RecurringRule } from '../models/RecurringRule.js'
import { Transaction } from '../models/Transaction.js'
import { isDatabaseConnected } from './database.js'
import { store } from './store.js'

function serializeTransaction(transaction) {
    if (!transaction) {
        return null
    }

    if (!transaction._id) {
        return transaction
    }

    return {
        id: transaction._id.toString(),
        clientId: transaction.clientId.toString(),
        type: transaction.type,
        amountCents: transaction.amountCents,
        category: transaction.category,
        description: transaction.description,
        date: new Date(transaction.date).toISOString(),
        recurringRuleId: transaction.recurringRuleId
            ? transaction.recurringRuleId.toString()
            : undefined,
        occurrenceDate: transaction.occurrenceDate || undefined,
    }
}

function serializeRule(rule) {
    if (!rule) {
        return null
    }

    if (!rule._id) {
        return rule
    }

    return {
        id: rule._id.toString(),
        clientId: rule.clientId.toString(),
        type: rule.type,
        amountCents: rule.amountCents,
        category: rule.category,
        description: rule.description,
        frequency: rule.frequency,
        startDate: rule.startDate,
        endDate: rule.endDate,
        active: rule.active,
        nextOccurrenceDate: rule.nextOccurrenceDate,
    }
}

export async function getClients() {
    if (!isDatabaseConnected()) {
        return store.clients
    }

    const clients = await Client.find().sort({ name: 1 }).lean()

    return clients.map(function serializeClient(client) {
        return {
            id: client._id.toString(),
            name: client.name,
        }
    })
}

export async function clientExists(clientId) {
    if (!isDatabaseConnected()) {
        return store.clients.some(function findClient(client) {
            return client.id === clientId
        })
    }

    const client = await Client.exists({ _id: clientId })
    return Boolean(client)
}

export async function findTransactions(clientId) {
    if (!isDatabaseConnected()) {
        return store.transactions
            .filter(function findTransaction(transaction) {
                return transaction.clientId === clientId
            })
            .sort(function sortNewestFirst(first, second) {
                return second.date.localeCompare(first.date)
            })
    }

    const transactions = await Transaction.find({ clientId: clientId })
        .sort({ date: -1 })
        .lean()

    return transactions.map(serializeTransaction)
}

export async function insertTransaction(transactionData) {
    if (!isDatabaseConnected()) {
        store.transactions.push(transactionData)
        return transactionData
    }

    const transaction = await Transaction.create(transactionData)
    return serializeTransaction(transaction.toObject())
}

export async function updateTransactionRecord(
    clientId,
    transactionId,
    transactionData,
) {
    if (!isDatabaseConnected()) {
        const transactionIndex = store.transactions.findIndex(
            function findTransaction(transaction) {
                return transaction.id === transactionId &&
                    transaction.clientId === clientId
            },
        )

        if (transactionIndex === -1) {
            return null
        }

        const currentTransaction = store.transactions[transactionIndex]
        const updatedTransaction = {
            ...currentTransaction,
            ...transactionData,
        }

        store.transactions[transactionIndex] = updatedTransaction
        return updatedTransaction
    }

    if (!mongoose.isValidObjectId(transactionId)) {
        return null
    }

    const transaction = await Transaction.findOneAndUpdate(
        {
            _id: transactionId,
            clientId: clientId,
        },
        transactionData,
        { new: true },
    ).lean()

    return serializeTransaction(transaction)
}

export async function deleteTransactionRecord(clientId, transactionId) {
    if (!isDatabaseConnected()) {
        const transactionIndex = store.transactions.findIndex(
            function findTransaction(transaction) {
                return transaction.id === transactionId &&
                    transaction.clientId === clientId
            },
        )

        if (transactionIndex === -1) {
            return false
        }

        store.transactions.splice(transactionIndex, 1)
        return true
    }

    if (!mongoose.isValidObjectId(transactionId)) {
        return false
    }

    const result = await Transaction.deleteOne({
        _id: transactionId,
        clientId: clientId,
    })

    return result.deletedCount === 1
}

export async function deleteTransactionRecords(clientId, transactionIds) {
    if (!isDatabaseConnected()) {
        const selectedIds = new Set(transactionIds)
        const previousCount = store.transactions.length

        store.transactions = store.transactions.filter(
            function keepTransaction(transaction) {
                const belongsToClient = transaction.clientId === clientId
                const isSelected = selectedIds.has(transaction.id)

                return !belongsToClient || !isSelected
            },
        )

        return previousCount - store.transactions.length
    }

    const validIds = transactionIds.filter(
        function keepValidId(transactionId) {
            return mongoose.isValidObjectId(transactionId)
        },
    )

    if (validIds.length === 0) {
        return 0
    }

    const result = await Transaction.deleteMany({
        _id: { $in: validIds },
        clientId: clientId,
    })

    return result.deletedCount
}

export async function deleteTransactionsByRule(clientId, ruleId) {
    if (!isDatabaseConnected()) {
        const previousCount = store.transactions.length

        store.transactions = store.transactions.filter(
            function keepTransaction(transaction) {
                const belongsToRule =
                    transaction.clientId === clientId &&
                    transaction.recurringRuleId === ruleId

                return !belongsToRule
            },
        )

        return previousCount - store.transactions.length
    }

    if (!mongoose.isValidObjectId(ruleId)) {
        return 0
    }

    const result = await Transaction.deleteMany({
        clientId: clientId,
        recurringRuleId: ruleId,
    })

    return result.deletedCount
}

export async function deleteRecurringRuleRecord(clientId, ruleId) {
    if (!isDatabaseConnected()) {
        const ruleIndex = store.recurringRules.findIndex(
            function findRule(rule) {
                return rule.id === ruleId && rule.clientId === clientId
            },
        )

        if (ruleIndex === -1) {
            return false
        }

        store.recurringRules.splice(ruleIndex, 1)
        return true
    }

    if (!mongoose.isValidObjectId(ruleId)) {
        return false
    }

    const result = await RecurringRule.deleteOne({
        _id: ruleId,
        clientId: clientId,
    })

    return result.deletedCount === 1
}

export async function findRecurringRules(clientId) {
    if (!isDatabaseConnected()) {
        return store.recurringRules
            .filter(function findRule(rule) {
                return rule.clientId === clientId
            })
            .reverse()
    }

    const rules = await RecurringRule.find({ clientId: clientId })
        .sort({ createdAt: -1 })
        .lean()

    return rules.map(serializeRule)
}

export async function insertRecurringRule(ruleData) {
    if (!isDatabaseConnected()) {
        store.recurringRules.push(ruleData)
        return ruleData
    }

    const rule = await RecurringRule.create(ruleData)
    return serializeRule(rule.toObject())
}

export async function updateRuleNextDate(ruleId, nextDate) {
    if (!isDatabaseConnected()) {
        const rule = store.recurringRules.find(function findRule(item) {
            return item.id === ruleId
        })

        if (rule) {
            rule.nextOccurrenceDate = nextDate
        }

        return
    }

    await RecurringRule.updateOne(
        { _id: ruleId },
        { nextOccurrenceDate: nextDate },
    )
}

export async function occurrenceExists(
    clientId,
    recurringRuleId,
    occurrenceDate,
) {
    if (!isDatabaseConnected()) {
        return store.transactions.some(function findOccurrence(transaction) {
            return transaction.clientId === clientId &&
                transaction.recurringRuleId === recurringRuleId &&
                transaction.occurrenceDate === occurrenceDate
        })
    }

    const transaction = await Transaction.exists({
        clientId: clientId,
        recurringRuleId: recurringRuleId,
        occurrenceDate: occurrenceDate,
    })

    return Boolean(transaction)
}
