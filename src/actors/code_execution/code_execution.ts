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
      console.log('GETTING COMPLETION')
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: 'system', content: 'You are a state machine definition writer. Your job is to write actor logic as a finite state machine using the xstate library v5 and typescript. Output a javascript fragment for the state machine definition. Only output the code, do not make any introduction or closing statements. Only output valid typescript. Do not attach a header. User messages are received by the event { type: "USER_MESSAGE", payload: data }.' },
          {
            role: 'system', content: `Available actions:
            {
              // Use to send a message to the user
              send_message: emit(({ input }) => ({
                type: 'ASSISTANT_MESSAGE',
                data: input,
              })),
              // Send final result to the user
              send_done
            }`
          },
          {
            role: 'system', content: `Expected output:   
{
  id: 'name',
  initial: 'initial state',
  context: {
    data to collect critical data to complete this flow
    key: value
  },
  // A list of logical steps to achieve goal
  states: {
    some_state: {
      entry: 'send_message',
      on: {
        SOME_EVENT: {
          target: 'next_state',
          actions: assign({ key: ({ event, input }) => event.output.content }),
        }
      }
    },
    // TRANSITION TO THIS STATE WHEN DONE. DO NOT MODIFY THIS STATE. IT MUST BE INCLUDED IN THE OUTPUT.
    done: {
      entry: 'send_done',
      type: 'final'
    }
  },
}`
          },
          { role: 'user', content: 'I am planning a trip to Paris. Help me plan my itinerary.' }
        ]
      })
      console.log(completion.choices[0].message.content)
      return completion.choices[0].message
    }),
  },
}).createMachine({
  context: ({ input }) => ({
    messages: [],
    unsafe_machine: '',
    childRef: null,
  }),
  id: "Code Execution",
  initial: "generating_state_machine",
  states: {
    generating_state_machine: {
      invoke: {
        id: "create_state_machine",
        input: {},
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
        childRef: ({ context, spawn, self }) => {
          console.log('MACHINE DEF', context.unsafe_machine)
          const machineState = eval(`(${context.unsafe_machine})`) // Demo purposes only :)
          // Define what actions this hosted machine can take
          const childMachine = setup({
            actions: {
              send_message: emit(({ event }) => ({
                type: 'ASSISTANT_MESSAGE',
                data: event,
              })),
              send_done: emit(({ context }) => ({
                type: 'DONE',
                data: context,
              })),
            }
          }).createMachine(machineState)
          const actor = createActor(childMachine, { inspect })
          console.log(actor)
          actor.start()
          actor.subscribe((snapshot) => {
            console.log('TRANSITION', snapshot)
          })
          actor.on('DONE', (event) => {
            const context = event.data
            debugger
            console.log('GOT DONE EVENT', event, self)
            self.send(event)
          })
          return actor
        },
      }),
      on: {
        USER_MESSAGE: {
          actions: ['forward_event']
        },
        DONE: 'done'
      }
    },
    done: {
      type: "final",
    },
  },
});

export default machine