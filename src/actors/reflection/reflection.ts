import { assign, setup } from "xstate";
import writerAgent from '../writer/writer'
import criticAgent from '../critic/critic'

/**
 * Multi-agent Thread
 */

const machine = setup({
    types: {
        input: {} as {
            dish: string
        },
        context: {} as {
            messages: Array<{ role: string, content: string }>,
            loopCount: number,
            maxLoopCount: number,
        },
    },
    actions: {
        addMessage: assign({ messages: ({ event, context }) => [...context.messages, event.output] }),
    },
    actors: {
        writerAgent,
        criticAgent,
    },
}).createMachine({
    id: "Reflection (Recipe)",
    initial: "writing",
    context: ({ input }) => ({
        // Goal
        messages: [{ role: "user", content: `Write a recipe for the dish: ${input.dish}` },],
        loopCount: 0,
        maxLoopCount: 1,
    }),
    states: {
        writing: {
            invoke: {
                id: "writerAgent",
                src: "writerAgent",
                input: ({ context }) => ({
                    threadMessages: context.messages,
                }),
                onDone: {
                    target: "critiquing",
                    actions: "addMessage"
                },
            },
        },
        critiquing: {
            invoke: {
                id: "criticAgent",
                src: "criticAgent",
                input: ({ context }) => ({
                    // Only critique the latest message
                    threadMessages: [context.messages[context.messages.length - 1]],
                }),
                onDone: [
                    {
                        target: "writing",
                        actions: assign({
                            loopCount: ({ context }) => context.loopCount + 1,
                            messages: ({ context, event }) => [...context.messages, event.output]
                        }),
                        guard: ({ context }) =>
                            context.loopCount < context.maxLoopCount,
                    },
                    {
                        target: "done",
                    },
                ],
            },
        },
        done: {
            type: 'final'
        }
    },
    output: ({ context }) => context.messages[context.messages.length - 1].content
});

export default machine