import writerMachine from './actors/writer/writer'
import criticMachine from './actors/critic/critic'
import threadMachine from './actors/thread/thread'
import supervisionMachine from './actors/supervision/supervision'
import toolApprovalMachine from './actors/tool_approval/tool_approval'
import { createActor } from 'xstate'
const agents = {
  writer: [writerMachine, { input: { threadMessages: [{ role: 'user', content: 'Write a recipe for tacos' }] } }],
  critic: [criticMachine, { input: { threadMessages: [{ role: 'assistant', content: "To make tacos, fill the tortillas with tomatoes, cheese, and grated carrots." }] } }],
  thread: [threadMachine, { input: { dish: "Tacos" } }],
  supervisor: [supervisionMachine],
  toolApproval: [toolApprovalMachine, { input: { threadMessages: [{ role: 'user', content: 'Write a recipe for tacos' }] } }],
}

const agentSelect = document.getElementById('agents');
const invokeAgentButton = document.getElementById('invokeAgentButton');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
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
    option.textContent = agent.charAt(0).toUpperCase() + agent.slice(1);
    agentSelect.appendChild(option);
}

// Handle agent selection with button click
invokeAgentButton.addEventListener('click', () => {
    if (agents[agentSelect.value] != null) {
        currentAgent = createActor(agents[agentSelect.value][0], agents[agentSelect.value][1])

        // Handle incoming messages
        currentAgent.on('*', (data) => {
            appendMessage(`Agent Message: ${JSON.stringify(data)}`);
        });

        currentAgent.subscribe((snapshot) => {
          if (snapshot.status === 'done') {
            appendMessage(`Output: ${JSON.stringify(snapshot.output)}`);
            // appendMessage(`Context: ${JSON.stringify(snapshot.context)}`)
          }else {
            appendMessage(`Progress: ${snapshot.value}...`)
          }
        });
        currentAgent.start()
        clearMessages()
        appendMessage(`Agent Invoked: ${agentSelect.value}`);
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
        currentAgent.send({ type: 'USER_INPUT', payload: message });
        messageInput.value = ''; // Clear the input field
    }
});

// Optionally handle connection and disconnection events
socket.on('connect', () => {
    appendMessage('Connected to the server.');
});

socket.on('disconnect', () => {
    appendMessage('Disconnected from the server.');
});


document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
