import { assign, setup, fromPromise, emit, createActor, createMachine, toPromise, sendTo, spawnChild } from 'xstate';
import { createBrowserInspector } from '@statelyai/inspect';
import OpenAI from "openai";
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey,
  // Running in browser due to lack of support in xstate inspector for nodejs environment
  // Risks to api key mitigated via vite environment variables
  dangerouslyAllowBrowser: true
});

const { inspect } = createBrowserInspector();
export const machine = setup({
  types: {
    input: {} as {
      threadMessages: Array<{ role: string, content: string }>
    },
    output: {} as { role: string, content: string },
    context: {}
  },
  actions: {
    forward_event: sendTo(({ context }) => context.childRef, ({ context, event }) => {
      console.log('FORWARDING', event)
      return event
    }),
    add_output: assign({ child_output: ({ event }) => event.data }),
    add_unsafe_machine: assign({ unsafe_machine: ({ event }) => event.output.content }),
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
    send_message: emit(({ context }) => ({
      type: 'ASSISTANT_MESSAGE',
      data: context.unsafe_machine,
    })),
    log: emit(({ context, event }) => ({
      type: 'GOT INPUT',
      data: event
    })),
  },
  actors: {
    create_state_machine: fromPromise(async ({ input }) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: input.messages
      })
      console.log(completion.choices[0].message.content)
      return completion.choices[0].message
    }),
  },
}).createMachine({
  context: ({ input }) => ({
    messages: [
      { role: 'system', content: 'You are a state machine engineer. Represent the process defined on THE PAGE as a process defined as a state machine. Use xstate library. Only output the JSON, do not make any introduction or closing statements. Do not output "```json". Only output valid JSON. Do not attach a header.' },
      { role: 'system', content: 'Use valid Xstate v5 API.' },
      { role: 'system', content: `Available Actors:
        type(target, value)
        click(target)
      `},
      // { role: 'system', content: 'Available events: { type: "USER_MESSAGE", payload: data }.' },
      // {
      //   role: 'system', content: `Available actions:
      //   {
      //     // Write the event to context
      //     add_response: assign({ key: ({ event, input }) => event.output.content }),
      //     // Use to send a message to the user
      //     send_message: emit(({ input }) => ({
      //       type: 'ASSISTANT_MESSAGE',
      //       data: input,
      //     })),
      //     // Send final result to the user
      //     send_done
      //   }`
      // },
      // {
      //   role: 'system', content: `Available actors:
      //   {
      //     // Use the hotel_booking_agent to book a hotel
      //     hotel_booking_agent
      //     // Use the resaurant_booking_agent to make a reservation at a restaurant
      //     restaurant_booking_agent
      //   }`
      // },
//       {
//         role: 'system', content: `Expected JSON output:   
// {
// id: 'name',
// initial: 'initial state'
// // Initial context values that will be updated via events during the workflow.
// context: {},
// // A list of logical steps to achieve goal
// states: {
// waiting_on_input: {
//   entry: {
//     type: 'send_message',
//     params: { message: 'question to ask the user' }
//   },
//   on: {
//     SOME_EVENT: {
//       target: 'next_state',
//       actions: 'add_response'
//     }
//   }
// },
// // TRANSITION TO THIS STATE WHEN DONE. DO NOT MODIFY THIS STATE. IT MUST BE INCLUDED IN THE OUTPUT.
// done: {
//   entry: 'send_done',
//   type: 'final'
// }
// },
// }`
//       },
      ...input.threadMessages
    ],
    unsafe_machine: '',
    childRef: null,
  }),
  id: "Code Execution (Trip Planning)",
  initial: "generating_state_machine",
  states: {
    generating_state_machine: {
      invoke: {
        id: "create_state_machine",
        input: ({ context }) => ({
          messages: context.messages
        }),
        onDone: {
          target: "hosting",
          actions: [
            {
              type: "add_unsafe_machine",
            },
          ],
        },
        src: "create_state_machine",
      },
    },
    hosting: {
      entry: assign({
        childRef: ({ context, self }) => {
          console.log('MACHINE DEF', context.unsafe_machine)
          const machineState = eval(`(${context.unsafe_machine})`) // Ideally JSON.parse, assign and input are inline functions

          // Define what actions this hosted machine can take
          const childMachine = setup({
            actions: {
              send_message: emit((event, params) => {
                return {
                  type: 'ASSISTANT_MESSAGE',
                  data: params,
                }
              }),
              send_done: emit(({ context }) => ({
                type: 'DONE',
                data: context,
              })),
            },
            actors: {
              hotel_booking_agent: fromPromise(({ input }) => Promise.resolve("hotel_booking_agent called with input: " + JSON.stringify(input)))
            }
          }).createMachine(machineState)

          const actor = createActor(childMachine, { inspect })

          // Forward all events to parent
          actor.on('*', (event) => {
            self.send(event)
          })

          actor.start()
          return actor
        },
      }),
      on: {
        ASSISTANT_MESSAGE: {
          actions: emit(({ event }) => event),
        },
        USER_MESSAGE: {
          actions: ['forward_event']
        },
        DONE: {
          target: 'done',
          actions: 'add_output',
        }
      }
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => ({ role: 'assistant', content: 'Final output from child:' + JSON.stringify(context.child_output) })
});

export default machine