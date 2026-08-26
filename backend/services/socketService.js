const {Server} = require('socket.io');
const User = require('../models/User');
const message = require('../models/Message');

// Map to store online users and their corresponding socket IDs
const onlineUsers = new Map();

// Map to track the last message sent by each user
const typingUsers = new Map();

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin:process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
        pingTimeout: 60000, // Set ping timeout to 60 seconds
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        let userId = null;

        // handle user connection and store their socket ID
        socket.on('userConnected', async (connectingUserId) => {
            try {
              userId = connectingUserId;
              onlineUsers.set(userId, socket.id);
              console.log(
                `User ${userId} connected with socket ID: ${socket.id}`,
              );
              socket.join(userId); // Join a room with the user's ID

              // update user status in db
              await User.findByIdAndUpdate(userId, {
                isOnline: true,
                lastSeen: new Date(),
              });

              // handle all users that this user is now online

              io.emit("userStatusChanged", { userId, isOnline: true });
            }
            catch (error) {
                console.error('Error updating user status:', error);
            }
        })

        // return online status of all users
        socket.on("getUserStatus" , (requestingUserId, callback) => {
            const isOnline = onlineUsers.has(requestingUserId);
            callback({ 
                userId: requestingUserId, isOnline ,
                lastSeen: isOnline ? new Date() : null
            });
        });

        // forward meassages to the recipient if they are online
        socket.on('sendMessage', async (message) => {
            try {
                const { senderId, recipientId, content } = message;
                const recipientSocketId = onlineUsers.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('receiveMessage', message);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', 'Failed to send message');
            }
        })

        // update message as read and notify the sender
        socket.on('messageRead', async ({ messageId, readerId }) => {
            try {
                const messageDoc = await message.findByIdAndUpdate(
                    messageId,
                    { isRead: true },
                    { new: true }
                );
                socket.emit('messageRead', messageDoc);
            } catch (error) {
                console.error('Error updating message status:', error);
                socket.emit('error', 'Failed to update message status');
            }
        });

        // 
    })
};