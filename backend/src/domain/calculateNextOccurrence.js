import { addDays, getDaysInMonth } from 'date-fns'
import { calculateNextMonthlyDate } from './calculateNextMonthlyDate.js'

function isValidDate(value) {
    return value instanceof Date && !Number.isNaN(value.getTime())
}

export function calculateNextOccurrence(
    currentDate,
    frequency,
    startDate,
) {
    if (!isValidDate(currentDate)) {
        throw new Error('Dabartinė data yra netinkama')
    }

    if (!isValidDate(startDate)) {
        throw new Error('Pradinė data yra netinkama')
    }

    if (frequency === 'weekly') {
        return addDays(currentDate, 7)
    }

    if (frequency === 'monthly') {
        return calculateNextMonthlyDate(
            currentDate,
            startDate.getDate(),
        )
    }

    if (frequency === 'yearly') {
        const nextYear = currentDate.getFullYear() + 1
        const originalMonth = startDate.getMonth()
        const originalDay = startDate.getDate()

        const targetMonth = new Date(nextYear, originalMonth, 1)
        const daysInTargetMonth = getDaysInMonth(targetMonth)
        const occurrenceDay = Math.min(originalDay, daysInTargetMonth)

        return new Date(nextYear, originalMonth, occurrenceDay)
    }

    throw new Error(`Nepalaikomas pasikartojimo dažnis: ${frequency}`)
}