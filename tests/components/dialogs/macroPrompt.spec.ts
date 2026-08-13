import { describe, expect, it } from 'vitest'
import { mergeMacroPromptEvents } from '@/components/dialogs/macroPrompt'
import { ServerStateEventPrompt } from '@/store/server/types'

const date = new Date(0)

function event(type: string, message: string): ServerStateEventPrompt {
    return { date, type, message }
}

describe('mergeMacroPromptEvents', () => {
    it('replaces prompt text without changing controls', () => {
        const current = [
            event('begin', 'Calibration'),
            event('text', 'Measurement 1'),
            event('button', 'Stop|ABORT'),
            event('show', ''),
        ]

        const result = mergeMacroPromptEvents(current, [event('update', 'Measurement 2')])

        expect(result.map(({ type, message }) => ({ type, message }))).toEqual([
            { type: 'begin', message: 'Calibration' },
            { type: 'text', message: 'Measurement 2' },
            { type: 'button', message: 'Stop|ABORT' },
            { type: 'show', message: '' },
        ])
    })

    it('inserts text after begin when the prompt has no text block', () => {
        const current = [event('begin', 'Calibration'), event('show', '')]

        const result = mergeMacroPromptEvents(current, [event('update', 'Measurement 1')])

        expect(result.map(({ type, message }) => ({ type, message }))).toEqual([
            { type: 'begin', message: 'Calibration' },
            { type: 'text', message: 'Measurement 1' },
            { type: 'show', message: '' },
        ])
    })
})
