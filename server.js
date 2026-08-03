const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
});

// Подключение к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securechat';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Модели
const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },
  participants: [
    {
      socketId: String,
      publicKey: String,
      name: String,
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});
const Room = mongoose.model('Room', roomSchema);

const messageSchema = new mongoose.Schema({
  roomId: String,
  senderId: String, // socket.id
  senderName: String,
  encryptedMessage: String, // зашифрованный текст или аудио
  type: { type: String, default: 'text' }, // 'text' или 'audio'
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// Хранилище комнат в памяти для участников
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Присоединение к комнате
  socket.on('join-room', async ({ roomId, publicKey, name }) => {
    socket.join(roomId);
    let room = await Room.findOne({ roomId });
    if (!room) {
      room = new Room({ roomId, participants: [] });
    }
    // Добавляем участника
    room.participants.push({ socketId: socket.id, publicKey, name });
    await room.save();

    // Сохраняем в памяти
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    rooms.get(roomId).set(socket.id, { publicKey, name });

    // Отправляем историю сообщений
    const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
    socket.emit('chat-history', messages);

    // Уведомляем остальных
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      publicKey,
      name,
    });

    // Отправляем текущий список участников новому пользователю
    const participantsList = Array.from(rooms.get(roomId).entries()).map(
      ([id, data]) => ({ socketId: id, ...data })
    );
    socket.emit('participants-list', participantsList);

    // Обработка сообщений
    socket.on('send-message', async ({ roomId, encryptedMessage, type = 'text' }) => {
      const sender = rooms.get(roomId)?.get(socket.id);
      if (!sender) return;
      const message = new Message({
        roomId,
        senderId: socket.id,
        senderName: sender.name,
        encryptedMessage,
        type,
      });
      await message.save();
      // Рассылаем всем в комнате (включая отправителя, чтобы синхронизировать)
      io.to(roomId).emit('new-message', {
        _id: message._id,
        senderId: socket.id,
        senderName: sender.name,
        encryptedMessage,
        type,
        createdAt: message.createdAt,
      });
    });

    // Сигналинг WebRTC
    socket.on('webrtc-signal', ({ roomId, signal, targetSocketId }) => {
      io.to(targetSocketId).emit('webrtc-signal', {
        signal,
        from: socket.id,
        fromName: rooms.get(roomId)?.get(socket.id)?.name || 'Unknown',
      });
    });

    // Отключение
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      // Удаляем из комнат
      for (const [roomId, participants] of rooms.entries()) {
        if (participants.has(socket.id)) {
          participants.delete(socket.id);
          socket.to(roomId).emit('user-left', socket.id);
          // Обновляем в БД
          await Room.updateOne(
            { roomId },
            { $pull: { participants: { socketId: socket.id } } }
          );
          if (participants.size === 0) {
            rooms.delete(roomId);
          }
          break;
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
