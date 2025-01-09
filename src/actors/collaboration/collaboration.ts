import { assign, createActor, emit, fromPromise, setup, toPromise } from "xstate";
import recipeThreadAgent from '../writer/writer'
import OpenAI from "openai";

const DELAY = 2000
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey,
  // Running in browser due to lack of support in xstate inspector for nodejs environment
  // Risks to api key mitigated via vite environment variables
  dangerouslyAllowBrowser: true
});

const machine = setup({
  actors: {
    planningAgent: fromPromise(async ({ input }) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: 'system', content: 'Your mission is to deliver a meal to a customer by coordinating actions using the tools available. You must start by creating a detailed execution plan to accomplish the goal. Each tool must be invoked once and only once, in the appropriate sequence based on your execution plan. Only one tool must be called at a time. Do not invoke the next tool until the previous has returned a result. Execute the `done` tool last.' },
          ...input.threadMessages,
        ],    
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
      await new Promise(resolve => setTimeout(resolve, DELAY));
      console.log('Planning Agent:', JSON.stringify(completion.choices[0].message, null, 2))
      return completion.choices[0].message
    }),
    summarizationAgent: fromPromise(async ({ input }) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: 'system', content: `Pitch <Input> to the humans like your life depends on it. <Input>${JSON.stringify(input)}</Input> {}` }],
      })
      await new Promise(resolve => setTimeout(resolve, DELAY));
      console.log('Summarization Agent:', JSON.stringify(completion.choices[0].message, null, 2))
      return completion.choices[0].message.content
    }),
    recipeAgent: fromPromise(async ({ input, emit }) => {
      const actor = createActor(recipeThreadAgent, { input: { dish: input.dish } });
      actor.on('*', (m) => {
        console.log('Recipe Agent:', m)
        emit(m)
      })
      actor.start();
      const output = await toPromise(actor);
      return {
        role: "tool",
        content: JSON.stringify(output),
        tool_call_id: input.tool_call_id
      }
    }),
    procurementAgent: fromPromise(async ({ input }) => {
      // Fake actor output
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const output = { role: 'assistant', content: 'Ingredients available' }
      return {
        role: "tool",
        content: JSON.stringify(output),
        tool_call_id: input.tool_call_id
      }
    }),
    mealPrepAgent: fromPromise(async ({ input }) => {
      // Fake actor output
      await new Promise(resolve => setTimeout(resolve, DELAY));
      const output = { role: 'assistant', content: 'Meal delivered' }
      return {
        role: "tool",
        content: JSON.stringify(output),
        tool_call_id: input.tool_call_id
      }
    }),
    humanFeedbackAgent: fromPromise(async ({ input }) => {
      // Fake actor output
      await new Promise(resolve => setTimeout(resolve, DELAY));
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
      threadMessages: Array<{ role: string, content: string }>,
      recipe: string
      procurement: string
      meal_prep: string
      feedback: string
      summary: string,
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
    add_thread_message: assign({ threadMessages: ({ event, context }) => [...context.threadMessages, event.output] }),
    add_recipe: assign({ recipe: ({ event }) => event.output }),
    add_procurement: assign({ procurement: ({ event }) => event.output }),
    add_meal_prep: assign({ meal_prep: ({ event }) => event.output }),
    add_feedback: assign({ feedback: ({ event }) => event.output }),
    add_summary: assign({ summary: ({ event }) => event.output }),
  }
}).createMachine({
  id: "Orchestration (Meal Delivery)",
  context: {
    threadMessages: [],
    recipe: '',
    procurement: '',
    meal_prep: '',
    feedback: '',
    summary: '',
  },
  initial: "Planning",
  states: {
    Planning: {
      invoke: {
        input: ({ context }) => context,
        src: "planningAgent",
        onDone: [
          {
            target: "Writing Recipe",
            actions: "add_thread_message",
            guard: "tool_choice is recipeAgent",
          },
          {
            target: "Preparing Meal",
            actions: "add_thread_message",
            guard: "tool_choice is mealPrepAgent",
          },
          {
            target: "Procuring Ingredients",
            actions: "add_thread_message",
            guard: "tool_choice is procurementAgent",
          },
          {
            target: "Getting Feedback",
            actions: "add_thread_message",
            guard: "tool_choice is humanFeedbackAgent",
          },
          {
            target: "Summarizing Result",
            actions: "add_thread_message",
          },
        ],
      },
    },
    "Writing Recipe": {
      invoke: {
        src: "recipeAgent",
        input: ({ event }) => ({
          tool_call_id: event.output.tool_calls[0].id,
        }),
        onDone: {
          target: "Planning",
          actions: ["add_thread_message", "add_recipe"]
        },
      },
    },
    "Preparing Meal": {
      invoke: {
        src: "mealPrepAgent",
        input: ({ event }) => ({
          tool_call_id: event.output.tool_calls[0].id,
        }),
        onDone: {
          target: "Planning",
          actions: ["add_thread_message", "add_meal_prep"]
        },
      },
    },
    "Procuring Ingredients": {
      invoke: {
        src: "procurementAgent",
        input: ({ event }) => ({
          tool_call_id: event.output.tool_calls[0].id,
        }),
        onDone: {
          target: "Planning",
          actions: ["add_thread_message", "add_procurement"]
        },
      },
    },
    "Getting Feedback": {
      invoke: {
        src: "humanFeedbackAgent",
        input: ({ event }) => ({
          tool_call_id: event.output.tool_calls[0].id,
        }),
        onDone: {
          target: "Planning",
          actions: ["add_thread_message", "add_feedback"]
        },
      },
    },
    "Summarizing Result": {
      invoke: {
        src: "summarizationAgent",
        input: ({ context }) => context,
        onDone: {
          target: "Done",
          actions: ["add_thread_message", "add_summary"]
        },
      },
    },
    Done: {
      type: "final",
    },
  },
  output: ({ context }) => context.summary
});

export default machine