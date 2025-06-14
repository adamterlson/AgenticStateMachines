
# Agentic State Machines—Pattern Library

Harnessing the timeless **Finite State Machine (FSM)** and **Actor Model** alongside **Large Language Models (LLMs)** provides a structured and reliable approach to developing agentic cognitive architectures. Patterns such as tool use, reflection, planning, supervision, and human-in-the-loop interaction can be implemented effectively using FSMs. Together, FSMs and LLMs enable the creation of applications that are understandable, scalable, observable, modular, and resilient.

## Getting Started

```
echo "VITE_OPENAI_API_KEY=your openai api key here" >> .env.local
npm install
npm run dev # Start Vite server
```

## Examples of Agentic AI Patterns Using FSMs

This repository aims to demonstrate common agentic patterns implemented with FSMs:

1. [**Writer w/ Tool Use**](./actors/writer/writer.md): Managing tools with clearly defined activation, execution, and error states.
2. [**Reflection**](./src/actors/reflection/reflection.md): Passing messages between two agents with feedback on how to refine and improve output.
3. [**Collaboration**](./src/actors/collaboration/collaboration.md): Defined sequence of steps between specialist agents to reach outcome.
4. [**Human-in-the-Loop**]('./src/actors/human_in_the_loop/human_in_the_loop.md): Defining explicit manual interactions in workflows.
5. [**Orchestration/Routing**](./src/actors/collaboration/collaboration.md): Central orchestrator directs next step in the flow.
6. [**Chartering/Agent Creation**](./src/actors/code_execution/code_execution.md): Generating a novel process to accomplish the mission and hosting it with injected/parent-defined implementation and behavior.

## What is an AI Agent?

For the purposes of this project, an "Agent" is an Actor, an LLM, and a State Machine. For more details see [https://www.youtube.com/watch?v=oNG70nUcriI](https://www.youtube.com/watch?v=oNG70nUcriI).

## The Perfect Pair: LLMs and State Machines for Smarter, More Reliable AI Agents

State machines are a powerful complement to the unpredictability of LLMs. By combining FSMs with LLMs, developers can craft systems that balance the creativity and flexibility of generative AI with the robustness and reliability of FSMs. Using FSMs can make AI agents that are:

- **Statically Analyzable**—State machines offer a clear, formal definition of all states and transitions in the system. Developers can easily build process to handle and recover from errors.
- **Observable/Auditable**—FSMs allow you to monitor the agent's current state and transitions in real time. This transparency is crucial for debugging and understanding complex workflows.
- **Predictable**—While LLMs introduce stochastic behavior, FSMs are deterministic. This predictability ensures that the overall system behaves consistently, even when the LLM does not.
- **Resilient to Errors**—FSMs excel at defining fallback states and error recovery paths, making them ideal for systems where failure modes need to be well-understood and manageable. FSMs can enforce constraints on transitions, ensuring the system cannot enter invalid states, thus reducing the likelihood of cascading failures.
- **Modular**—By breaking workflows into discrete states, FSMs promote modularity, making it easier to extend or adapt the system without introducing bugs.
- **Aligned with Engineering Practices**—FSMs are well-understood tools across disciplines, meaning developers can leverage existing knowledge and tooling to build robust systems.

## Foundational/Ubiquitous Patterns + LLM Generation > API Abstraction

While libraries and frameworks like LangChain, LangGraph, AutoGen, and CrewAI can accelerate Agent development, they introduce several challenges:

- **Additional Cognitive Load**—Developers must learn the framework’s abstractions and APIs, which may not align with their mental models or existing workflows.
- **Tool Lock-In**—Frameworks often lock developers into specific APIs or patterns, making it harder to migrate or evolve the architecture over time. Frameworks require the use of a specific programming language (notably Python)
- **Obscured Behavior**—Frameworks abstract away important details of execution, making it difficult to debug or analyze the system's behavior in edge cases. Learning how Agentic systems work behind the scenes can be made difficult by these abstractions
- **Complexity Overhead**—Frameworks often introduce layers of complexity, requiring additional code to fit specific use cases or integrate with other parts of the system.
- **Limited Flexibility**—Customization can be challenging, as frameworks often prioritize general-purpose solutions over niche requirements.

By leveraging **finite state machines**—a "bread and butter" tool in software engineering—developers can avoid the pitfalls of heavy frameworks and instead:

- **Empower AI Generation**: State machines are simple and ubiquitous, supporting LLMs to understand, generate, and refine, enabling rapid development and self-improving architectures.
- **Build with Consistency**: Use the same patterns and techniques across agentic and non-agentic components of the system.
- **Improve Maintainability**: Rely on straightforward, proven approaches that reduce long-term maintenance costs.
- **Integrate Seamlessly**: Use FSMs to bridge agentic workflows with other system components, such as UI, backend services, and external APIs.
- **Language Agnostic**: Finite State Machines can be built in every language—having an understanding of Agentic patterns using FSMs will enable Agentic systems in any system, regardless of language

In short, FSMs provide a flexible, extensible, and robust foundation for developing agentic AI systems that scale with confidence.

## Contributing

Contributions and feedback are welcome! If you have ideas for new patterns, improvements, or discussions about state machines in agentic architectures, feel free to open an issue or submit a pull request.
