import { createActor } from "xstate";
import writerMachine from './actors/writer/writer'
import criticMachine from './actors/critic/critic'
import threadMachine from './actors/thread/thread'
import supervisionMachine from './actors/supervision/supervision'
import toolApprovalMachine from './actors/tool_approval/tool_approval'

// const actor = createActor(writerMachine, { input: { dish: "Tacos", additionalMessages: [{ role: 'user', content: 'Do not use cheese' }] } });
//  const actor = createActor(threadMachine, { input: { dish: "Tacos" } });
// const actor = createActor(supervisionMachine);
// // const actor = createActor(criticMachine, { input: { recipe: "To make tacos, fill the tortillas with tomatoes, cheese, and grated carrots." } });
// actor.subscribe((s) => {
//     //   console.log(s);
//     console.log('Current state', s.value)
//     console.log('Context messages', JSON.stringify(s.context.messages, null, 2))
// });

// actor.start();
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';

// Create an Express app
const app = express();

// Proxy chat completion to avoid ever putting the API key in browser
app.post('/chat', async (req, res) => {
    try {
      const input = req.body; // Ensure to use a middleware like body-parser or express.json()
      const completion = await openai.chat.completions.create(input);
      res.json(completion);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error while processing OpenAI request.");
    }
  });  

// Create an HTTP server
const server = http.createServer(app);

// Initialize a new Socket.IO server
const io = new Server(server, {
    cors: {
        origin: '*', // Adjust this to allow specific origins
        methods: ['GET', 'POST'],
    },
});

const agents = {
    writer: [writerMachine, { input: { threadMessages: [{ role: 'user', content: 'Write a recipe for tacos' }] } }],
    critic: [criticMachine, { input: { threadMessages: [{ role: 'assistant', content: "To make tacos, fill the tortillas with tomatoes, cheese, and grated carrots." }] } }],
    thread: [threadMachine, { input: { dish: "Tacos" } }],
    supervisor: [supervisionMachine],
    toolApproval: [toolApprovalMachine, { input: { threadMessages: [{ role: 'user', content: 'Write a recipe for tacos' }] } }],
}

// Log connection and disconnection events
io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.emit('availableAgents', agents)

    socket.on('invokeAgent', (data: string) => {
        // Listen for custom events
        const actor: typeof agents['writer'] = createActor(...agents[data])
        actor.on('*', (emitted) => {
            io.emit('message', JSON.stringify(emitted));
        });
        // Listen to state change snapshots
        actor.subscribe((s) => {
            //   console.log(s);
            console.log('Progress: ', s.value)
            io.emit('message', 'Progress: ' + s.value);
        });
        socket.on('message', (data: string) => {
            actor.send({ type: 'USER_INPUT', payload: data })
            console.log(`Message from ${socket.id}: ${data}`);
            // Broadcast the message to all connected clients
            // io.emit('message', data);
        });
        actor.start()
    })

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
    });
});


export const viteNodeApp = app;
