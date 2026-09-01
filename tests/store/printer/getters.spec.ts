import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { getters } from '@/store/printer/getters'
import type { PrinterState } from '@/store/printer/types'
import type { RootState } from '@/store/types'

describe('printer/getEstimatedTimeETAFormat', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    const runGetter = (eta: number, hours12Format = false) => {
        const moduleGetters = {
            getEstimatedTimeETA: eta,
        } as Record<string, number>

        const rootGetters = {
            'gui/getHours12Format': hours12Format,
        } as Record<string, boolean>

        return getters.getEstimatedTimeETAFormat({} as PrinterState, moduleGetters, {} as RootState, rootGetters)
    }

    it('returns "--" when eta is not in the future', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))

        const eta = new Date(2024, 0, 1, 10, 0, 0).getTime()
        expect(runGetter(eta)).toBe('--')

        const eta2 = new Date(2024, 0, 1, 9, 0, 0).getTime()
        expect(runGetter(eta2)).toBe('--')
    })

    it('formats time in 24-hour mode without day offset', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))

        const eta = new Date(2024, 0, 1, 16, 5, 0).getTime()
        expect(runGetter(eta)).toBe('16:05')
    })

    it('formats time in 24-hour mode with day offset case 1', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 22, 0, 0))
        const eta = new Date(2024, 0, 2, 1, 0, 0).getTime()
        expect(runGetter(eta)).toBe('01:00 +1')
    })

    it('formats time in 24-hour mode with day offset case 2', () => {
        vi.setSystemTime(new Date(2023, 11, 31, 22, 0, 0))
        const eta = new Date(2024, 0, 1, 0, 0, 0).getTime()
        expect(runGetter(eta)).toBe('00:00 +1')
    })

    it('formats time in 24-hour mode with day offset case 3', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 22, 0, 0))
        const eta = new Date(2024, 0, 3, 1, 0, 0).getTime()
        expect(runGetter(eta)).toBe('01:00 +2')
    })

    it('formats time in 24-hour mode with day offset case 4', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 1, 0, 0))
        const eta = new Date(2025, 0, 1, 1, 0, 0).getTime()
        expect(runGetter(eta)).toBe('01:00 +366') // 2024 is a leap year thats why +366
    })

    it('formats time in 24-hour mode with day offset', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 22, 0, 0))
        const eta = new Date(2024, 0, 2, 1, 0, 0).getTime()
        expect(runGetter(eta)).toBe('01:00 +1')

        const eta2 = new Date(2024, 0, 2, 0, 0, 0).getTime()
        expect(runGetter(eta2)).toBe('00:00 +1')
    })

    it('formats time in 12-hour mode without day offset', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))

        const eta = new Date(2024, 0, 1, 16, 5, 0).getTime()
        expect(runGetter(eta, true)).toBe('04:05 PM')
    })

    it('formats time in 12-hour mode with day offset', () => {
        vi.setSystemTime(new Date(2024, 0, 1, 23, 30, 0))

        const eta = new Date(2024, 0, 2, 1, 0, 0).getTime()
        expect(runGetter(eta, true)).toBe('01:00 AM +1')
    })
})

describe('printer/getFilamentSensors', () => {
    it('includes PAT9125 sensors as independently switchable filament sensors', () => {
        const state = {
            'pat9125_filament_sensor h1_filament': {
                enabled: false,
                filament_detected: false,
            },
            'pat9125_filament_sensor h0_filament': {
                enabled: true,
                filament_detected: true,
                detection_length: 4,
                minimum_flow: 70,
                flow_percentage: 95,
            },
        } as unknown as PrinterState

        expect(getters.getFilamentSensors(state, {}, {} as RootState, {})).toEqual([
            {
                type: 'pat9125_filament_sensor',
                name: 'h0_filament',
                enabled: true,
                filament_detected: true,
                filament_diameter: undefined,
                detection_length: 4,
                minimum_flow: 70,
                flow_percentage: 95,
            },
            {
                type: 'pat9125_filament_sensor',
                name: 'h1_filament',
                enabled: false,
                filament_detected: false,
                filament_diameter: undefined,
                detection_length: undefined,
                minimum_flow: undefined,
                flow_percentage: undefined,
            },
        ])
    })
})

describe('printer active extruder', () => {
    it('uses the FLOW active tool when it is available', () => {
        const state = {
            flow_idex_modes: { active_tool: 1 },
            toolhead: { extruder: 'extruder' },
        } as unknown as PrinterState

        expect(getters.getActiveExtruder(state, {}, {} as RootState, {})).toBe('extruder1')
    })

    it('falls back to the standard toolhead extruder', () => {
        const state = {
            toolhead: { extruder: 'extruder1' },
        } as unknown as PrinterState

        expect(getters.getActiveExtruder(state, {}, {} as RootState, {})).toBe('extruder1')
    })

    it('checks can_extrude on the resolved active extruder', () => {
        const state = {
            extruder: { can_extrude: false },
            extruder1: { can_extrude: true },
        } as unknown as PrinterState

        expect(
            getters.getExtrudePossible(state, { getActiveExtruder: 'extruder1' }, {} as RootState, {})
        ).toBe(true)
    })
})
