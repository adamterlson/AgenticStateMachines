import { assign, createActor, setup, fromCallback, fromPromise, sendTo } from 'xstate';

import OpenAI from "openai";
const openai = new OpenAI();

const machine = setup({
    types: {
        input: {} as {
            threadMessages: Array<{ role: string, content: string }>
        },
        output: {} as {
            role: string,
            content: string,
        }
    },
    actors: {
        recipe_critic: fromPromise(async ({ input }) => {
            console.log('GETTING COMPLETION')
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: input.messages
            })
            console.log(completion.choices[0].message)
            return completion.choices[0].message
        }),
    },
    actions: {
        add_assistant_message: assign({ messages: ({ event, context }) => [...context.messages, event.output] }),
    }
}).createMachine({
    initial: 'critiquing_recipe',
    context: ({ input }) => ({ 
        messages: [
            { role: "system", content: "You are a health food nut. Provide specific feedback on ingredients to remove that will make the provided recipe more healthy. Feedback should be a single sentence. Begin response with 'Nutritionist:'." },
            ...input.threadMessages
        ],
    }),
    states: {
        critiquing_recipe: {
            invoke: {
                id: 'recipe_critic',
                src: 'recipe_critic',
                input: ({ context }) => ({
                    messages: context.messages,
                }),
                onDone: {
                    target: 'done',
                    actions: 'add_assistant_message'
                }
            },
        },
        done: {
            type: 'final'
        }
    },
    // Summary: output last message
    output: ({ context }) => context.messages[context.messages.length - 1]
})

export default machine