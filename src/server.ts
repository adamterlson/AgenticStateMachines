import { createActor } from "xstate";
import writerMachine from './actors/writer/writer'
import criticMachine from './actors/critic/critic'
import threadMachine from './actors/thread/thread'
import planningMachine from './actors/planning/planning'

// const actor = createActor(writerMachine, { input: { dish: "Tacos", additionalMessages: [{ role: 'user', content: 'Do not use cheese' }] } });
//  const actor = createActor(threadMachine, { input: { dish: "Tacos" } });
// const actor = createActor(planningMachine);
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

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

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
    writer: createActor(writerMachine, { input: { threadMessages: [{ role: 'user', content: 'Do not use cheese' }] } }),
    critic: createActor(criticMachine, { input: { threadMessages: [{ role: 'assistant', content: "To make tacos, fill the tortillas with tomatoes, cheese, and grated carrots." }] } }),
    thread: createActor(threadMachine, { input: { dish: "Tacos" } }),
    planner: createActor(planningMachine),
}

// Log connection and disconnection events
io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.emit('availableAgents', agents)

    socket.on('invokeAgent', (data: string) => {
        // Listen for custom events
        const actor: typeof agents['writer'] = agents[data]
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

// Define a fallback route to serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
