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
    forward_event: sendTo(({ system }) => system.get('unsafe_machine'), ({ event }) => {
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
    emit_message: emit(({ context }) => ({
      type: 'INPUT_REQUEST',
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
          { role: 'system', content: 'You are a state machine definition writer. Your job is to write actor logic as a finite state machine using the xstate library v5 and typescript. Output a javascript fragment for the state machine definition. Only output the code, do not make any introduction or closing statements. Only output valid typescript. Do not attach a header.' },
          {
            role: 'system', content: `Expected output:   
{
  id: 'the name of the machine',
  initial: 'initial state',
  context: {
    critical data to collect from this flow
  },
  // A list of logical steps to achieve construct the context
  states: {
    some_state: {
      on: {
        SOME_EVENT: 'next_state'
      }
    },
    done: {
      type: 'final'
    }
  },
  output: ({ context }) => reduce context to return expected output
}`
          },
          { role: 'user', content: 'You are a trip advisor agent prompt generator. Your job is to write awesome prompts. Define a process for collecting information from the user one step at a time about their travel wishes and plans. At the end output a prompt. User input is collected via the { type: USER_INPUT, payload: string } event.' }
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
          target: "executing",
          actions: [
            {
              type: "add_unsafe_machine",
            },
            {
              type: "emit_message",
            },
          ],
        },
        src: "create_state_machine",
      },
    },
    executing: {
      entry: assign({
        childRef: ({ context, spawn }) => {
          // Demo purposes only :)
          console.log('MACHINE DEF', context.unsafe_machine)
          const machineState = eval(`(${context.unsafe_machine})`)
          const childMachine = createMachine(machineState)
          const original = childMachine.transition
          childMachine.transition = (...args) => {
            console.log('TRANSITION', args)
            return original.apply(original, args)
          }
          return spawn(childMachine, { systemId: 'unsafe_machine' })
        },
      }),
      on: {
        USER_INPUT: {
          actions: ['forward_event']
        }
      }
    },
    done: {
      type: "final",
    },
  },
});

export default machine