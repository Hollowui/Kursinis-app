import {
    addMonths,
    getDaysInMonth,
    setDate,
    startOfMonth,
} from 'date-fns'

export function calculateNextMonthlyDate(currentDate, originalDay) {
    if (!(currentDate instanceof Date) ||
        Number.isNaN(currentDate.getTime())
    ) {
        throw new Error('Dabartinė data yra netinkama')
    }

    if (!Number.isInteger(originalDay) ||
        originalDay < 1 ||
        originalDay > 31
    ) {
        throw new Error('Pradinė mėnesio diena turi būti nuo 1 iki 31')
    }

    const nextMonth = startOfMonth(addMonths(currentDate, 1))
    const daysInNextMonth = getDaysInMonth(nextMonth)
    const occurrenceDay = Math.min(originalDay, daysInNextMonth)

    return setDate(nextMonth, occurrenceDay)
}