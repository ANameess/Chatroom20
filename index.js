const express = require('express');
const http = require('http');
const socket = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);
//t
app.use(express.static(path.join(__dirname, 'public')));

const users = {}; // Store user information

// When the user connects allows the functions inside to be used
io.on('connection', (socket) => {
  console.log('A user connected');

  // When a user joins a room run this function
  socket.on('join', (data) => {
    socket.username = data.username;
    socket.room = data.room;
    socket.join(data.room);
    users[socket.id] = { username: socket.username, room: socket.room };
    const roomUsers = getRoomUsers(socket.room);
    io.to(socket.room).emit('room users', roomUsers);

    io.to(socket.room).emit('chat message', { username: "Server", message: `${socket.username} joined the room.`})

    socket.emit('room info', { room: socket.room });
      console.log(`User ${socket.username} joined ${socket.room}.`);
   socket.emit('admin status', { isAdmin: users[socket.id].isAdmin })
    });
    
  socket.on('send video chunk', (data) => {
    // Broadcast the received video chunk to all users in the same room
    io.to(socket.room).emit('received video chunk', { username: socket.username, chunk: data.chunk });
  });
  


  // Helper function to get socket by username
  function getSocketByUsername(username) {
    return Object.values(io.sockets.sockets).find(s => s.username === username);
  }

  // Upon 'announce' being emitted, emit 'announcement' with the username and message data
  socket.on('announce', (data) => {
    const announcement = data.messageSystem;
    io.emit('announcement', { username: 'Announcement', messageSystem: announcement });
  });

  socket.on('admin', (data) => {
      const kickedSocket = getSocketByUsername(data.username);
      if (kickedSocket) {
        kickedSocket.emit('kicked');
        io.to(socket.room).emit('chat message', { username: "Server", message: `${kickedSocket.username} was kicked from the room.`})
        kickedSocket.disconnect(true);
    }
  });
  
  socket.on('chat message', (data) => {
    const taggedUser = data.message.match(/@(\w+)/);
    if (taggedUser) {
      const taggedUsername = taggedUser[1];
      io.to(socket.room).emit('chat message', { username: socket.username, message: data.message, taggedUsername });
    } else {
      io.to(socket.room).emit('chat message', { username: socket.username, message: data.message });
    }
    
  });


  socket.on('send image', (data) => {
    io.to(socket.room).emit('received image', { username: socket.username, image: data.image });
  });

  socket.on('leave room', () => {

    if (socket.room) {
      if (socket.room !== '') {
        io.to(socket.room).emit('chat message', { username: "Server", message: `${socket.username} left the room.`})
      }
      socket.leave(socket.room);
       delete users[socket.id];
      const roomUsers = getRoomUsers(socket.room);
     
      io.to(socket.room).emit('room users', roomUsers);
      
    }
  });

  socket.on('disconnect', () => {
    io.to(socket.room).emit('chat message', { username: "Server", message: `${socket.username} disconnected.`})
    if (users[socket.id]) {
      delete users[socket.id];
    }
    console.log('A user disconnected');
    const roomUsers = getRoomUsers(socket.room);
    io.to(socket.room).emit('room users', roomUsers);
  });

  function getRoomUsers(room) {
    return Object.values(users).filter(user => user.room === room).map(user => user.username);
  }
});

const PORT = process.env.PORT || 11312;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

