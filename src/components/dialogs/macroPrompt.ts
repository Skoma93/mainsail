import { ServerStateEventPrompt } from '@/store/server/types'

export function mergeMacroPromptEvents(
    currentPrompt: ServerStateEventPrompt[],
    promptEvents: ServerStateEventPrompt[]
): ServerStateEventPrompt[] {
    const nextPrompt = [...currentPrompt]

    for (const event of promptEvents) {
        if (event.type !== 'update') {
            nextPrompt.push(event)
            continue
        }

        const textIndex = nextPrompt.findIndex((promptEvent) => promptEvent.type === 'text')
        const textEvent = { ...event, type: 'text' }
        if (textIndex !== -1) {
            nextPrompt.splice(textIndex, 1, textEvent)
            continue
        }

        const beginIndex = nextPrompt.findIndex((promptEvent) => promptEvent.type === 'begin')
        nextPrompt.splice(beginIndex + 1, 0, textEvent)
    }

    return nextPrompt
}
