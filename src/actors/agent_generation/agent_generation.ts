import { setup, assign, createMachine, fromPromise } from "xstate";
import OpenAI from "openai";
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey,
    // Running in browser due to lack of support in xstate inspector for nodejs environment
    // Risks to api key mitigated via vite environment variables
    dangerouslyAllowBrowser: true
});

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
            return input
        }),
        createStates: fromPromise(async ({ input }) => {
            console.log('createStates')
            console.log('INPUT', input)
            return input
        }),
        createContext: fromPromise(async ({ input }) => {
            console.log('createContext')
            console.log('INPUT', input)
            return input
        }),
        createActors: fromPromise(async ({ input }) => {
            console.log('createActors')
            console.log('INPUT', input)
            return input
        }),
        writeMachine: fromPromise(async ({ input }) => {
            console.log('writeMachine')
            console.log('INPUT', input)
            return input
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
                                input: ({ context }) => ({ goal: context.goal_info }),
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
                input: {},
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