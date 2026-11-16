import { describe, expect, test } from 'vitest'
import { calculateNextOccurrence } from './calculateNextOccurrence.js'

describe('calculateNextOccurrence', function () {
    test('prideda 7 dienas savaitinei taisyklei', function () {
        const startDate = new Date(2026, 9, 10)

        const result = calculateNextOccurrence(
            startDate,
            'weekly',
            startDate,
        )

        expect(result).toEqual(new Date(2026, 9, 17))
    })

    test('mėnesinei taisyklei pritaiko paskutinę mėnesio dieną', function () {
        const startDate = new Date(2027, 0, 31)

        const result = calculateNextOccurrence(
            startDate,
            'monthly',
            startDate,
        )

        expect(result).toEqual(new Date(2027, 1, 28))
    })

    test('metinei vasario 29 dienos taisyklei grįžta į keliamųjų metų datą', function () {
        const startDate = new Date(2028, 1, 29)

        const date2029 = calculateNextOccurrence(
            startDate,
            'yearly',
            startDate,
        )

        const date2030 = calculateNextOccurrence(
            date2029,
            'yearly',
            startDate,
        )

        const date2031 = calculateNextOccurrence(
            date2030,
            'yearly',
            startDate,
        )

        const date2032 = calculateNextOccurrence(
            date2031,
            'yearly',
            startDate,
        )

        expect(date2029).toEqual(new Date(2029, 1, 28))
        expect(date2030).toEqual(new Date(2030, 1, 28))
        expect(date2031).toEqual(new Date(2031, 1, 28))
        expect(date2032).toEqual(new Date(2032, 1, 29))
    })

    test('atmeta nepalaikomą pasikartojimo dažnį', function () {
        const startDate = new Date(2026, 9, 10)

        expect(function () {
            calculateNextOccurrence(
                startDate,
                'daily',
                startDate,
            )
        }).toThrow('Nepalaikomas pasikartojimo dažnis: daily')
    })
})
