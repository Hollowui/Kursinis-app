import { describe, expect, it } from 'vitest'
import { calculateNextOccurrence } from './calculateNextOccurrence.js'

describe('calculateNextOccurrence', () => {
    it('prideda 7 dienas savaitinei taisyklei', () => {
        const startDate = new Date(2026, 9, 10)

        const result = calculateNextOccurrence(
            startDate,
            'weekly',
            startDate,
        )

        expect(result).toEqual(new Date(2026, 9, 17))
    })

    it('mėnesinei taisyklei pritaiko paskutinę mėnesio dieną', () => {
        const startDate = new Date(2027, 0, 31)

        const result = calculateNextOccurrence(
            startDate,
            'monthly',
            startDate,
        )

        expect(result).toEqual(new Date(2027, 1, 28))
    })

    it('metinei vasario 29 dienos taisyklei grįžta į keliamųjų metų datą', () => {
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

    it('atmeta nepalaikomą pasikartojimo dažnį', () => {
        const startDate = new Date(2026, 9, 10)

        expect(() => {
            calculateNextOccurrence(
                startDate,
                'daily',
                startDate,
            )
        }).toThrow('Nepalaikomas pasikartojimo dažnis: daily')
    })
})