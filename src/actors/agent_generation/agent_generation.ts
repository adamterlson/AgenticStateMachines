import { setup, assign, createMachine, fromPromise } from "xstate";
import OpenAI from "openai";
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey,
    // Running in browser due to lack of support in xstate inspector for nodejs environment
    // Risks to api key mitigated via vite environment variables
    dangerouslyAllowBrowser: true
});
const DELAY = 3000
export const machine = setup({
    types: {
        input: {} as {
            goal_info: string,
        },
        context: {} as {
            goal_info: string,
            actors_info: string,
            events_info: string,
            states_info: string,
            context_info: string,
            machine_code: string
        },
    },
    actors: {
        createEvents:fromPromise(async ({ input }) => {
            console.log('createEvents')
            console.log('INPUT', input)
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  { role: 'system', content: 'You are leading an event storming exercise. Your job is to understand fully the provided domain by listing every possible event within the bounded context. Use DDD language. Events should be of the fomat [NOUN]_[PAST TENSE VERB].' },
                  { role: 'system', content: 'The output must be valid typescript. Do not output any headers or other text. Do not output ```'},
                  { role: 'user', content: `Goal: ${input.goal}` }
                ],
            })
            await new Promise(resolve => setTimeout(resolve, DELAY));
            console.log('CreateEvents Agent:', JSON.stringify(completion.choices[0].message, null, 2))
            return completion.choices[0].message.content
        }),
        createStates: fromPromise(async ({ input }) => {
            console.log('createStates')
            console.log('INPUT', input)
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  { role: 'system', content: 'You are a state machine designer. The user will provide you with a list of domain events in <Domain Events> that occur in a given system. Based on these events, produce a set of states and transitions for a state machine configuration. The state machine should start from an initial state, Include all relevant states implied by the events, Clearly model transitions triggered by these domain events, Be ordered logically based on common workflows, Include any terminal or final states if applicable.' },
                  { role: 'system', content: 'The output must be valid typescript. Do not output any headers or other text. Do not output ```'},
                  { role: 'user', content: `<Domain Events>${JSON.stringify(input.events)}</Domain Events>` }
                ],
            })
            await new Promise(resolve => setTimeout(resolve, DELAY));
            console.log('Create States Agent:', JSON.stringify(completion.choices[0].message, null, 2))
            return completion.choices[0].message.content
        }),
        createContext: fromPromise(async ({ input }) => {
            console.log('createContext')
            console.log('INPUT', input)
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  { role: 'system', content: 'You are a software engineer. The user will provide you with a goal, and your task is to define a TypeScript object type named Context that includes all the relevant pieces of information needed to achieve that goal. Include only the properties that would be logically required for an AI agent to achieve the given goal. Do not include any extraneous data. Consider what the agent will need to know: initial inputs, intermediate data, results of computations, references to external data sources, and final outputs.' },
                  { role: 'system', content: 'The output must be valid typescript. Do not output any headers or other text. Do not output ```'},
                  { role: 'user', content: `Goal: ${input.goal}` }
                ],
            })
            await new Promise(resolve => setTimeout(resolve, DELAY));
            console.log('Create Context Agent:', JSON.stringify(completion.choices[0].message, null, 2))
            return completion.choices[0].message.content
        }),
        createActors: fromPromise(async ({ input }) => {
            console.log('createActors')
            console.log('INPUT', input)
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  { role: 'system', content: 'You are a software engineer. The user will provide you with a goal, and you will produce promise-returning functions that call services to perform necessary side effects in order to accomplish that goal. The functions should be written in TypeScript. Each function should return a Promise, and should be named according to the action it performs. These services might include calling external APIs, performing computations, or fetching and storing data. Make sure to include all parameters you think the functions would need based on the goal, and to outline what the functions are expected to do.' },
                  { role: 'system', content: 'The output must be valid typescript. Do not output any headers or other text. Do not output ```'},
                  { role: 'user', content: `Goal: ${input.goal}` }
                ],
            })
            await new Promise(resolve => setTimeout(resolve, DELAY));
            console.log('Create Actors Agent:', JSON.stringify(completion.choices[0].message, null, 2))
            return completion.choices[0].message.content
        }),
        writeMachine: fromPromise(async ({ input }) => {
            console.log('writeMachine')
            console.log('INPUT', input)
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                  { role: 'system', content: 'You are a software engineer. I will provide you with the following input in <Context>: a goal that describes what the machine should accomplish, a set of events that may occur, a context definition that specifies what data the machine can store, a set of actors (services) that the machine can invoke, and a set of actions that update the machine’s context. Your task is to generate a valid XState v5 state machine definition in TypeScript which uses without modification the given information and functionality. Do not create additional functionality, only use what is provided. MAKE SURE THAT THE XSTATE MACHINE IS VALID AND WORKS BEFORE RETURNING A RESULT!' },
                  { role: 'system', content: `<Context>${JSON.stringify(input)}</Context>`},
                  { role: 'system', content: `The output should follow the format:
setup({
    actors: { PUT ACTORS FROM <CONTEXT> HERE },
    actions: {
        use assign to update context
    }
}).createMachine({
    context: { initial context }
    initial: 'initial state',
    states: { 
        'initial state': {
            invoke: {
                src: actor
                onDone: next state
            }
        }
        'next state': {
            on: {
                EVENT: 'target state'
            }
        }
    }
})         
                    `},
                    { role: 'system', content: 'The output must be valid typescript. Do not output any headers or other text. Do not output ```'},
                ],
            })
            await new Promise(resolve => setTimeout(resolve, DELAY));
            console.log('Write Machine Agent:', completion.choices[0].message)
            return completion.choices[0].message.content
        }),
        testMachine: fromPromise(async ({ input }) => {
            console.log('testMachine')
            console.log('INPUT', input)
            return input
        }),
    },
    actions: {
        add_actors_info: assign({ actors_info: ({ event }) => event.output }),
        add_events_info: assign({ events_info: ({ event }) => event.output }),
        add_states_info: assign({ states_info: ({ event }) => event.output }),
        add_context_info: assign({ context_info: ({ event }) => event.output }),
        add_machine_code: assign({ machine_code: ({ event }) => event.output }),
    }
}).createMachine({
    id: "Agent Generation",
    context: ({ input }) => ({
        goal_info: input.goal_info,
        actors_info: '',
        events_info: '',
        states_info: '',
        context_info: '',
        machine_code: '',
    }),
    initial: "Setting Up Machine",
    states: {
        "Setting Up Machine": {
            type: "parallel",
            onDone: {
                target: "Writing Machine",
            },
            states: {
                "Defining Actors": {
                    initial: "Generating",
                    states: {
                        Generating: {
                            invoke: {
                                input: ({ context }) => ({ goal: context.goal_info }),
                                onDone: {
                                    target: "Done",
                                    actions: 'add_actors_info'
                                },
                                src: "createActors",
                            },
                        },
                        Done: {
                            type: "final",
                        },
                    },
                },
                "Defining Context": {
                    initial: "Generating",
                    states: {
                        Generating: {
                            invoke: {
                                input: ({ context }) => ({ goal: context.goal_info }),
                                onDone: {
                                    target: "Done",
                                    actions: 'add_context_info'
                                },
                                src: "createContext",
                            },
                        },
                        Done: {
                            type: "final",
                        },
                    },
                },
                "Defining States and Transitions": {
                    initial: "Generating Events",
                    states: {
                        "Generating Events": {
                            invoke: {
                                input: ({ context }) => ({ goal: context.goal_info }),
                                onDone: {
                                    actions: 'add_events_info',
                                    target: "Generating States",
                                },
                                src: "createEvents",
                            },
                        },
                        "Generating States": {
                            invoke: {
                                input: ({ context }) => ({ goal: context.goal_info, events: context.events_info }),
                                onDone: {
                                    actions: 'add_states_info',
                                    target: "Done",
                                },
                                src: "createStates",
                            },
                        },
                        Done: {
                            type: "final",
                        },
                    },
                },
            },
        },
        "Writing Machine": {
            invoke: {
                id: "Agent Generation.Writing Machine:invocation[0]",
                input: ({ context }) => ({ 
                    actors: context.actors_info,
                    events: context.events_info,
                    states: context.states_info,
                    context: context.context_info,
                 }),
                onDone: {
                    target: "Testing Machine",
                },
                src: "writeMachine",
            },
        },
        "Testing Machine": {
            invoke: {
                id: "Agent Generation.Testing Machine:invocation[0]",
                input: {},
                onDone: {
                    target: "Done",
                },
                onError: {
                    target: "Writing Machine",
                },
                src: "testMachine",
            },
        },
        Done: {
            type: "final",
        },
    },
});

export default machine