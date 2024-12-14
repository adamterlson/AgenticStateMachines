import writerMachine from './actors/writer/writer'
import criticMachine from './actors/critic/critic'
import reflectionMachine from './actors/reflection/reflection'
import routingMachine from './actors/collaboration/collaboration'
import toolApprovalMachine from './actors/human_in_the_loop/human_in_the_loop'
import codeExecutionMachine from './actors/code_execution/code_execution'
import agentGenerationMachine from './actors/agent_generation/agent_generation'
import { createActor } from 'xstate'
import { createBrowserInspector } from '@statelyai/inspect';

const { inspect } = createBrowserInspector();
const agents = {
	writer: [writerMachine, { input: { threadMessages: [{ role: 'user', content: 'Write a recipe for tacos' }] } }],
	critic: [criticMachine, { input: { threadMessages: [{ role: 'assistant', content: "To make tacos, fill the tortillas with tomatoes, cheese, and grated carrots." }] } }],
	reflection: [reflectionMachine, { input: { dish: "Tacos" } }],
	router: [routingMachine],
	toolApproval: [toolApprovalMachine, { input: { threadMessages: [{ role: 'user', content: 'Write a recipe for tacos' }] } }],
	codeExecution: [codeExecutionMachine],
	agentGenerationMachine: [agentGenerationMachine, { input: { goal_info: 'Plan a trip to paris' } }]
}

const agentSelect = document.getElementById('agents');
const invokeAgentButton = document.getElementById('invokeAgentButton');
const messagesDiv = document.getElementById('messages');
const inspectCheckbox = document.getElementById('inspectCheckbox');
const messageInput = document.getElementById('messageInput'); inspectCheckbox
const sendButton = document.getElementById('sendButton');

let currentAgent = null;

// Append a message to the messages div
function appendMessage(message) {
	const messageElement = document.createElement('div');
	messageElement.textContent = message;
	messagesDiv.appendChild(messageElement);
}

// Append a message to the messages div
function clearMessages() {
	messagesDiv.innerHTML = '';
}

// Clear existing options to prevent duplicates
agentSelect.innerHTML = '<option value="">-- Select an Agent --</option>';
console.log(Object.keys(agents))
for (const agent of Object.keys(agents)) {
	const option = document.createElement('option');
	option.value = agent;
	option.textContent = agents[agent][0].config.id;
	agentSelect.appendChild(option);
}

// Emit user messages to the server on Enter key press
messageInput.addEventListener('keypress', (event) => {
	if (event.key === 'Enter') {
		const message = messageInput.value.trim();
		if (message && currentAgent) {
			appendMessage('Human: ' + message);
			currentAgent.send({ type: 'USER_MESSAGE', payload: message });
			messageInput.value = ''; // Clear the input field
		}
		event.preventDefault(); // Prevent the default action of form submission if applicable
	}
});

// Handle agent selection with button click
invokeAgentButton.addEventListener('click', () => {
	if (agents[agentSelect.value] != null) {
		const finalOptions = { ...agents[agentSelect.value][1] };
		if (inspectCheckbox.checked) {
			finalOptions.inspect = inspect;
		}

		currentAgent = createActor(agents[agentSelect.value][0], finalOptions);

		// Handle incoming messages
		currentAgent.on('*', (event) => {
			appendMessage(`Agent Message: ${JSON.stringify(event.data)}`);
		});

		currentAgent.subscribe((snapshot) => {
			if (snapshot.status === 'done') {
				console.log('Context', snapshot.context)
				appendMessage(`Final Result: ${JSON.stringify(snapshot.output)}`);
			} else {
				appendMessage(`Progress: ${JSON.stringify(snapshot.value)}...`)
			}
		});
		currentAgent.start()
		clearMessages()
		appendMessage(`Agent Invoked: ${agents[agentSelect.value][0].config.id}`);
		messageInput.disabled = false;
		sendButton.disabled = false;
	} else {
		messageInput.disabled = true;
		sendButton.disabled = true;
		appendMessage('No agent selected.');
	}
});

// Emit user messages to the server
sendButton.addEventListener('click', () => {
	const message = messageInput.value.trim();
	if (message && currentAgent) {
		appendMessage(`You: ${message}`);
		currentAgent.send({ type: 'USER_MESSAGE', payload: message });
		messageInput.value = ''; // Clear the input field
	}
});
appendMessage('Connected to the server.');