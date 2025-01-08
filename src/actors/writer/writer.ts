import { assign, setup, fromPromise, emit } from 'xstate';

import OpenAI from "openai";
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey,
  // Running in browser due to lack of support in xstate inspector for nodejs environment
  // Risks to api key mitigated via vite environment variables
  dangerouslyAllowBrowser: true 
});

const machine = setup({
    types: {
        input: {} as {
            threadMessages: Array<{ role: string, content: string }>
        },
        output: {} as { role: string, content: string }
    },
    actors: {
        get_inventory: fromPromise(async () => {
            console.log('GETTING INVENTORY')
            return ['Tortillas', 'Beef', 'Beans', 'Tomatoes', 'Lettuce', 'Cheese', 'Carrots', 'Pickles', 'Bricks', 'Super Fatty Yogurt']
        }),
        recipe_author: fromPromise(async ({ input }) => {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: input?.messages,
                // tool_choice: 'required',
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'get_inventory',
                            description: 'Get the list of currently available ingredients',
                            parameters: {
                                type: 'object',
                                properties: {}
                            }
                        }
                    }
                ]
            })
            console.log(completion.choices[0].message)
            return completion.choices[0].message
        }),
    },
    actions: {
        add_user_message: assign({ messages: ({ event, context }) => [...context.messages, { role: 'user', content: event.payload }] }),
        add_assistant_message: assign({ messages: ({ event, context }) => [...context.messages, event.output] }),
        add_tool_response: assign({
            messages: ({ event, context }) => {
                return [...context.messages, {
                    role: "tool",
                    content: JSON.stringify(event.output),
                    tool_call_id: context.messages[context.messages.length - 1].tool_calls[0].id
                }]
            }
        }),
        emit_message: emit(({ context }) => ({
            type: 'SYSTEM_MESSAGE',
            data: `Available inventory: ${context.messages[context.messages.length - 1]}`,
        })),
    }
}).createMachine({
    id: "Writer (Recipe)",
    initial: 'writing',
    context: ({ input }) => ({
        messages: [
            // Role
            { role: "system", content: "You are a recipe writer that responds to feedback. Recipes are a single sentence. Begin by using the available tools to gather required information. Begin response with 'Writer:'. Do not include any ingredients in the recipe that are not available in the inventory." },
            // Backstory
            ...Array.isArray(input.threadMessages) ? input.threadMessages : []
        ],
    }),
    states: {
        writing: {
            invoke: {
                id: 'recipe_author',
                src: 'recipe_author',
                input: ({ context }) => ({
                    messages: context.messages,
                    tools: context.tools,
                }),
                onDone: [
                    {
                        guard: ({ context, event }) => event.output.tool_calls != null,
                        target: 'using_tool',
                        actions: ['add_assistant_message']
                    },
                    {
                        target: 'done',
                        actions: ['add_assistant_message']
                    }
                ],
            },
        },
        using_tool: {
            invoke: {
                id: 'get_inventory',
                src: 'get_inventory',
                onDone: {
                    target: 'writing',
                    actions: ['add_tool_response', 'emit_message']
                }
            }
        },
        done: {
            type: 'final'
        }
    },
    // Summary: output last message
    output: ({ context }) => context.messages[context.messages.length - 1]
})

export default machine