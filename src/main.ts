import { createActor } from 'xstate';
import { createBrowserInspector } from '@statelyai/inspect';
import agents from './actors';

const { inspect } = createBrowserInspector();

const agentSelect = document.getElementById('agents');
const invokeAgentButton = document.getElementById('invokeAgentButton');
const messagesContainer = document.getElementById('messages-container');
const adminMessagesContainer = document.getElementById('admin-messages-container');
const updatesDiv = document.getElementsByClassName('stateUpdates')[0];
const inspectCheckbox = document.getElementById('inspectCheckbox');

let currentAgents = {}; // Store agents as key-value pairs

function appendMessage(messagesDiv, message) {
  const messageArea = messagesDiv.querySelector('.chatMessages');
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageArea.appendChild(messageElement);
}

function appendUpdate(message) {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  updatesDiv.appendChild(messageElement);
}

function createMessagesDiv(agentId) {
  const template = document.getElementById('message-template');
  if (!template) {
    console.error('Template not found');
    return null;
  }
  const newMessagesDiv = template.cloneNode(true);
  newMessagesDiv.className = 'messages outer-container';
  newMessagesDiv.id = '';

  const messageInput = newMessagesDiv.querySelector('.messageInput');
  if (messageInput) {
    messageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const message = messageInput.value.trim();
        if (message) {
          appendMessage(newMessagesDiv, `Human: ${message}`);
          currentAgents[agentId].send({ type: 'USER_MESSAGE', payload: message });
          messageInput.value = '';
        }
        event.preventDefault();
      }
    });
  } else {
    console.error('Message input not found in the template');
  }

  const sendButton = newMessagesDiv.querySelector('.sendButton');
  sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
      appendMessage(newMessagesDiv, `You: ${message}`);
      currentAgents[agentId].send({ type: 'USER_MESSAGE', payload: message });
      messageInput.value = '';
    }
  });

  return newMessagesDiv;
}

function createAdminDiv(agentId) {
  const template = document.getElementById('message-template');
  if (!template) {
    console.error('Template not found');
    return null;
  }
  const newMessagesDiv = template.cloneNode(true);
  newMessagesDiv.className = 'messages outer-container';
  newMessagesDiv.id = '';

  newMessagesDiv.querySelector('.chatMessages-title').innerHTML = "Admin Session"

  const messageInput = newMessagesDiv.querySelector('.messageInput');
  if (messageInput) {
    messageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const message = messageInput.value.trim();
        if (message) {
          appendMessage(newMessagesDiv, `Human: ${message}`);
          currentAgents[agentId].send({ type: 'USER_MESSAGE', payload: message });
          messageInput.value = '';
        }
        event.preventDefault();
      }
    });
  } else {
    console.error('Message input not found in the template');
  }

  const sendButton = newMessagesDiv.querySelector('.sendButton');
  sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
      appendMessage(newMessagesDiv, `You: ${message}`);
      currentAgents[agentId].send({ type: 'USER_MESSAGE', payload: message });
      messageInput.value = '';
    }
  });

  return newMessagesDiv;
}

agentSelect.innerHTML = '<option value="">-- Select an Agent --</option>';
for (const agent of Object.keys(agents)) {
  const option = document.createElement('option');
  option.value = agent;
  option.textContent = agents[agent][0].config.id;
  agentSelect.appendChild(option);
}

agentSelect.addEventListener('change', () => {
  const agentKey = agentSelect.value;
  if (agents[agentKey] && agents[agentKey][1]) {
    agentConfigInput.value = JSON.stringify(agents[agentKey][1], null, 2);
  } else {
    agentConfigInput.value = '';
  }
});

invokeAgentButton.addEventListener('click', () => {
  const agentKey = agentSelect.value;
  if (agents[agentKey]) {
    let updatedProps;
    try {
      updatedProps = agentConfigInput.value.trim()
        ? JSON.parse(agentConfigInput.value.trim())
        : {};
    } catch (error) {
      appendUpdate('Error: Invalid JSON in the agent configuration.');
      return;
    }

    const finalOptions = { ...updatedProps };
    if (inspectCheckbox.checked) {
      finalOptions.inspect = inspect;
    }

    const agentId = agents[agentKey][0].config.id + '-' + Math.floor(Math.random() * 100); // Epic hack
    const newMessagesDiv = createMessagesDiv(agentId);
    const newAdminDiv = createAdminDiv(agentId);

    const rowDiv = document.createElement("div");
    rowDiv.className = "row";
    const redTeamDiv = document.createElement("div");
    redTeamDiv.className = "red-team";
    const blueTeamDiv = document.createElement("div");
    blueTeamDiv.className = "blue-team";
    blueTeamDiv.appendChild(newAdminDiv);
    redTeamDiv.appendChild(newMessagesDiv);
    rowDiv.appendChild(blueTeamDiv)
    rowDiv.appendChild(redTeamDiv)
    messagesContainer?.appendChild(rowDiv)

    const newAgent = createActor(agents[agentKey][0], finalOptions);
    currentAgents[agentId] = newAgent;

    appendUpdate(`Agent Invoked: ${agentId}`);
    appendMessage(newAdminDiv, `New session with Agent [${agentId}] has started.`);
    appendMessage(newMessagesDiv, `Agent [${agentId}] has joined.`);

    newAgent.on('SYSTEM_MESSAGE', (event) => {
      console.log('got message for ', agentId)
      appendUpdate(`Log message: ${typeof event.data === 'object' ? event.data.content : event.data}`);
    });
    newAgent.on('CLIENT_MESSAGE', (event) => {
      console.log('got message for ', agentId)
      appendMessage(newMessagesDiv, `From Agent: ${typeof event.data === 'object' ? event.data.content : event.data}`);
    });
    newAgent.on('ADMIN_MESSAGE', (event) => {
      console.log('got message for ', agentId)
      appendMessage(newAdminDiv, `ADMIN Message: ${typeof event.data === 'object' ? event.data.content : event.data}`);
    });

    newAgent.subscribe((snapshot) => {
      if (snapshot.status === 'done') {
        appendMessage(newMessagesDiv, `Result: ${JSON.stringify(snapshot.output)}`);
        appendMessage(newMessagesDiv, `Agent Finished with result: ${JSON.stringify(snapshot.output)}`);
        console.log('Context', snapshot.context);
      } else {
        appendUpdate(`Progress: ${JSON.stringify(snapshot.value)}...`);
      }
    });

    newAgent.start();
  } else {
    appendUpdate('No agent selected.');
  }
});

appendUpdate('Log instance ready.');
