import { assign, createActor, fromPromise, setup, toPromise } from "xstate";
import recipeThreadAgent from '../thread/thread'

import OpenAI from "openai";
const openai = new OpenAI();

const machine = setup({
  actors: {
    planningAgent: fromPromise(async ({ input }) => {
      const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: input?.messages,
          tool_choice: "required",
          tools: [
            {
                type: 'function',
                function: {
                    name: 'recipeAgent',
                    description: 'Create a new recipe.',
                    parameters: {
                        type: 'object',
                        properties: {
                          dish: {
                              type: "string",
                              description: "The name of the dish to create a recipe for"
                          }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'procurementAgent',
                    description: 'Acquire all ingredients necessary for a recipe.',
                }
            },
            {
                type: 'function',
                function: {
                    name: 'mealPrepAgent',
                    description: 'Execute the recipe and deliver a meal to the customer.',
                }
            },
            {
                type: 'function',
                function: {
                    name: 'humanFeedbackAgent',
                    description: 'Get feedback from the customer about their meal',
                }
            },
            {
                type: 'function',
                function: {
                    name: 'done',
                    description: 'Exit the flow'
                }
            }
        ]
      })
      console.log('Got plan message', JSON.stringify(completion.choices[0].message, null, 2))
      return completion.choices[0].message
    }),
    recipeAgent: fromPromise(async ({ input }) => {
      const actor = createActor(recipeThreadAgent, { input: { dish: input.dish } });
      actor.on('*', (m) => {
        console.log('GOT MIDDLE EVENT', m)
        emit(m)
      })
      actor.start();
      const output = await toPromise(actor);
      console.log('GOT FINAL OUTPUT FROM RECIPE', output)
      return {
        role: "tool",
        content: JSON.stringify(output),
        tool_call_id: input.tool_call_id
      }
    }),
    procurementAgent: fromPromise(async ({ input }) => {
      // Fake response
      const output = { role: 'assistant', content: 'Ingredients available' }
      return {
        role: "tool",
        content: JSON.stringify(output),
        tool_call_id: input.tool_call_id
      }
    }),
    mealPrepAgent: fromPromise(async ({ input }) => {
      // Fake response
      const output = { role: 'assistant', content: 'Meal delivered' }
      return {
        role: "tool",
        content: JSON.stringify(output),
        tool_call_id: input.tool_call_id
      }
    }),
    humanFeedbackAgent: fromPromise(async ({ input }) => {
      // Fake response
      const output = { role: 'assistant', content: '5/5' }
      return {
        role: "tool",
        content: JSON.stringify(output),
        tool_call_id: input.tool_call_id
      }
    }),
  },
  types: {
    context: {} as {
      messages: Array<{ role: string, content: string }>
    },
  },
  guards: {
    "tool_choice is recipeAgent": function ({ context, event }) {
      return event.output.tool_calls != null && event.output.tool_calls[0].function.name === 'recipeAgent'
    },
    "tool_choice is procurementAgent": function ({ context, event }) {
      return event.output.tool_calls != null && event.output.tool_calls[0].function.name === 'procurementAgent'
    },
    "tool_choice is mealPrepAgent": function ({ context, event }) {
      return event.output.tool_calls != null && event.output.tool_calls[0].function.name === 'mealPrepAgent'
    },
    "tool_choice is humanFeedbackAgent": function ({ context, event }) {
      return event.output.tool_calls != null && event.output.tool_calls[0].function.name === 'humanFeedbackAgent'
    },
    "tool_choice is done": function ({ context, event }) {
      return event.output.tool_calls != null && event.output.tool_calls[0].function.name === 'done'
    },
  },
  actions: {
    add_assistant_message: assign({ messages: ({ event, context }) => [...context.messages, event.output] }),
  }
}).createMachine({
  id: "Planner",
  context: {
    messages: [
      { role: 'system', content: 'Your mission is to deliver a meal to a customer by coordinating actions using the tools available. You must start by creating a detailed execution plan to accomplish the goal. Each tool must be invoked once and only once, in the appropriate sequence based on your execution plan. Only one tool must be called at a time. Do not invoke the next tool until the previous has returned a result. Execute the `done` tool last.' }
    ]
  },
  initial: "Planning",
  states: {
    Planning: {
      invoke: {
        input: ({ context }) => ({
          messages: context.messages,
        }),
        src: "planningAgent",
        onDone: [
          {
            target: "Writing Recipe",
            actions: "add_assistant_message",
            guard: "tool_choice is recipeAgent",
          },
          {
            target: "Preparing Meal",
            actions: "add_assistant_message",
            guard: "tool_choice is mealPrepAgent",
          },
          {
            target: "Procuring Ingredients",
            actions: "add_assistant_message",
            guard: "tool_choice is procurementAgent",
          },
          {
            target: "Getting Feedback",
            actions: "add_assistant_message",
            guard: "tool_choice is humanFeedbackAgent",
          },
          {
            target: "Done",
            actions: "add_assistant_message",
          },
        ],
      },
    },
    "Writing Recipe": {
      invoke: {
        src: "recipeAgent",
        input: ({ context }) => ({
          dish: "Chili",
          tool_call_id: context.messages[context.messages.length - 1].tool_calls[0].id,
        }),
        onDone: {
          target: "Planning",
          actions: "add_assistant_message"
        },
      },
    },
    "Preparing Meal": {
      invoke: {
        src: "mealPrepAgent",
        input: ({ context }) => ({
          tool_call_id: context.messages[context.messages.length - 1].tool_calls[0].id,
        }),
        onDone: {
          target: "Planning",
          actions: "add_assistant_message"
        },
      },
    },
    "Procuring Ingredients": {
      invoke: {
        src: "procurementAgent",
        input: ({ context }) => ({
          tool_call_id: context.messages[context.messages.length - 1].tool_calls[0].id,
        }),
        onDone: {
          target: "Planning",
          actions: "add_assistant_message"
        },
      },
    },
    "Getting Feedback": {
      invoke: {
        src: "humanFeedbackAgent",
        input: ({ context }) => ({
          tool_call_id: context.messages[context.messages.length - 1].tool_calls[0].id,
        }),
        onDone: {
          target: "Planning",
          actions: "add_assistant_message"
        },
      },
    },
    Done: {
      type: "final",
    },
  },
});

export default machine