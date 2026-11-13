import { describe, expect, it } from 'vitest'
import { calculateNextMonthlyDate } from './calculateNextMonthlyDate.js'

describe('calculateNextMonthlyDate', () => {
    it('apskaičiuoja kitą įprastą mėnesio datą', () => {
        const currentDate = new Date(2026, 9, 1)

        const result = calculateNextMonthlyDate(currentDate, 1)

        expect(result).toEqual(new Date(2026, 10, 1))
    })

    it('naudoja paskutinę vasario dieną ir kovą grįžta į 31 dieną', () => {
        const januaryDate = new Date(2027, 0, 31)

        const februaryDate = calculateNextMonthlyDate(januaryDate, 31)
        const marchDate = calculateNextMonthlyDate(februaryDate, 31)

        expect(februaryDate).toEqual(new Date(2027, 1, 28))
        expect(marchDate).toEqual(new Date(2027, 2, 31))
    })

    it('atmeta netinkamą pradinę mėnesio dieną', () => {
        const currentDate = new Date(2026, 9, 1)

        expect(() => {
            calculateNextMonthlyDate(currentDate, 0)
        }).toThrow('Pradinė mėnesio diena turi būti nuo 1 iki 31')
    })
})