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
            console.log('GETTING COMPLETION', input.messages)
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
        remove_tool_call: assign({
            messages: ({  context }) => context.messages.slice(0, -1)
        }),
        emit_message: emit(({ context }) => ({
            type: 'SYSTEM_MESSAGE',
            data: context.messages[context.messages.length - 1],
        })),
    },
    guards: {
        is_tool_call: ({ context, event }) => event.output.tool_calls != null,
        is_approval_message: ({ event }) => event.payload === 'approved'
    }
}).createMachine({
    id: "WriterToolApproval",
    initial: 'writing',
    context: ({ input }) => ({
        messages: [
            // Role
            { role: "system", content: "You are a recipe writer that responds to feedback. Recipes are a single sentence. Begin by using the available tools to gather required information. Begin response with 'Writer:'. Do not include any ingredients in the recipe that are not available in the inventory. If you lack permission to use required tools then give an error message back and end." },
            // Backstory
            ...input.threadMessages
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
                        guard: 'is_tool_call',
                        target: 'approval_required',
                        actions: ['add_assistant_message', 'emit_message']
                    },
                    {
                        target: 'done',
                        actions: ['add_assistant_message', 'emit_message']
                    }
                ],
            },
        },
        approval_required: {
            on: {
                USER_MESSAGE: [{
                    target: 'using_tool',
                    guard: 'is_approval_message'
                }, {
                    target: 'writing',
                    actions: ['remove_tool_call', 'add_user_message']
                }]
            }
        },
        using_tool: {
            invoke: {
                id: 'get_inventory',
                src: 'get_inventory',
                onDone: {
                    target: 'writing',
                    actions: 'add_tool_response'
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