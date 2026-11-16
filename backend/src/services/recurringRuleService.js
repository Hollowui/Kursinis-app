import { randomUUID } from 'node:crypto'
import { calculateNextOccurrence } from '../domain/calculateNextOccurrence.js'
import { store } from '../data/store.js'
import { ValidationError } from './transactionService.js'

const SUPPORTED_FREQUENCIES = ['weekly', 'monthly', 'yearly']
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function normalizeClientId(clientId) {
    return clientId.toString()
}

function parseDateOnly(value, fieldName) {
    if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} yra netinkama`)
    }

    const match = DATE_ONLY_PATTERN.exec(value)

    if (!match) {
        throw new ValidationError(
            `${fieldName} turi būti YYYY-MM-DD formato`,
        )
    }

    const [, yearText, monthText, dayText] = match
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)
    const date = new Date(year, month - 1, day)

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        throw new ValidationError(`${fieldName} yra netinkama`)
    }

    return date
}

function formatDateOnly(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function validateRule(input) {
    if (!['income', 'expense'].includes(input.type)) {
        throw new ValidationError(
            'Operacijos tipas turi būti income arba expense',
        )
    }

    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
        throw new ValidationError(
            'Suma turi būti teigiamas sveikas centų skaičius',
        )
    }

    if (typeof input.category !== 'string' || input.category.trim() === '') {
        throw new ValidationError('Kategorija yra privaloma')
    }

    if (!SUPPORTED_FREQUENCIES.includes(input.frequency)) {
        throw new ValidationError(
            'Dažnis turi būti weekly, monthly arba yearly',
        )
    }

    const startDate = parseDateOnly(input.startDate, 'Pradžios data')
    let endDate = null

    if (input.endDate) {
        endDate = parseDateOnly(input.endDate, 'Pabaigos data')

        if (endDate < startDate) {
            throw new ValidationError(
                'Pabaigos data negali būti ankstesnė už pradžios datą',
            )
        }
    }

    return {
        type: input.type,
        amountCents: input.amountCents,
        category: input.category.trim(),
        description:
            typeof input.description === 'string'
                ? input.description.trim()
                : '',
        frequency: input.frequency,
        startDate: formatDateOnly(startDate),
        endDate: endDate ? formatDateOnly(endDate) : null,
        active: input.active !== false,
    }
}

export function listRecurringRules(clientId) {
    const normalizedClientId = normalizeClientId(clientId)

    return store.recurringRules.filter(
        (rule) => rule.clientId === normalizedClientId,
    )
}

export function createRecurringRule(clientId, input) {
    const ruleData = validateRule(input)
    const rule = {
        id: randomUUID(),
        clientId: normalizeClientId(clientId),
        ...ruleData,
        nextOccurrenceDate: ruleData.startDate,
    }

    store.recurringRules.push(rule)

    return rule
}

function hasGeneratedOccurrence(rule, occurrenceDate) {
    return store.transactions.some(
        (transaction) =>
            transaction.clientId === rule.clientId &&
            transaction.recurringRuleId === rule.id &&
            transaction.occurrenceDate === occurrenceDate,
    )
}

function buildTransaction(rule, occurrenceDate) {
    return {
        id: randomUUID(),
        clientId: rule.clientId,
        type: rule.type,
        amountCents: rule.amountCents,
        category: rule.category,
        description: rule.description,
        date: `${occurrenceDate}T00:00:00.000Z`,
        recurringRuleId: rule.id,
        occurrenceDate,
    }
}

export function generateDueTransactions(clientId, throughDateValue) {
    const normalizedClientId = normalizeClientId(clientId)
    const throughDate = parseDateOnly(
        throughDateValue,
        'Generavimo data',
    )
    const generatedTransactions = []
    let skippedDuplicates = 0

    for (const rule of store.recurringRules) {
        if (rule.clientId !== normalizedClientId || !rule.active) {
            continue
        }

        const startDate = parseDateOnly(rule.startDate, 'Pradžios data')
        const endDate = rule.endDate
            ? parseDateOnly(rule.endDate, 'Pabaigos data')
            : null
        let occurrenceDate = parseDateOnly(
            rule.nextOccurrenceDate,
            'Kita vykdymo data',
        )

        while (
            occurrenceDate <= throughDate &&
            (!endDate || occurrenceDate <= endDate)
        ) {
            const occurrenceDateValue = formatDateOnly(occurrenceDate)

            if (hasGeneratedOccurrence(rule, occurrenceDateValue)) {
                skippedDuplicates += 1
            } else {
                const transaction = buildTransaction(
                    rule,
                    occurrenceDateValue,
                )

                store.transactions.push(transaction)
                generatedTransactions.push(transaction)
            }

            occurrenceDate = calculateNextOccurrence(
                occurrenceDate,
                rule.frequency,
                startDate,
            )
        }

        rule.nextOccurrenceDate = formatDateOnly(occurrenceDate)
    }

    return {
        generatedTransactions,
        skippedDuplicates,
    }
}
