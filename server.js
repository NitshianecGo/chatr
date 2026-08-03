// server.js (Backend)

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();
const crypto = require('crypto'); // Импортируем для шифрования

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- 1. МОДЕЛИ (Упрощенно) ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    passwordHash: { type: String, required: true }, // Хэш пароля
});
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    senderId: { type: String, required: true },
    text: { type: String, required: true }, // Текст сообщения (зашифрованный)
    mediaUrl: { type: String, default: null }, // Ссылка на аудио/видео файл
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);


// --- 2. MIDDLEWARE ---
app.use(express.json());

// --- 3. ПОДКЛЮЧЕНИЕ К БД ---
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Backend: MongoDB успешно подключен!'))
.catch(err => console.error('❌ Backend: Ошибка подключения к MongoDB:', err));


// --- 4. API ЭНДПОИНТЫ (Аутентификация и Чат) ---

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // В реальном проекте здесь нужно использовать bcrypt для хеширования пароля!
        const newUser = new User({ username, passwordHash: password }); 
        await newUser.save();
        res.status(201).json({ message: 'Пользователь зарегистрирован!', username: newUser.username });
    } catch (error) {
        res.status(400).json({ message: 'Ошибка регистрации.', error: error.message });
    }
});

// Получение истории чата по ссылке
app.get('/api/chat/:chatId', async (req, res) => {
    const { chatId } = req.params;
    try {
        // Здесь будет поиск чата в БД и получение данных
        const chatData = {
            id: chatId,
            randomName: `Пользователь_${Math.floor(Math.random() * 1000)}`, // Рандомное имя!
            participants: ['userA', 'userB'],
            lastMessage: "Привет! Начнем чат.",
        };
        res.status(200).json(chatData);
    } catch (error) {
        res.status(404).json({ message: 'Чат не найден.' });
    }
});

// Отправка сообщения (с шифрованием)
app.post('/api/messages', async (req, res) => {
    const { chatId, senderId, text, mediaFile } = req.body;

    try {
        // 1. ШИФРОВАНИЕ ТЕКСТА
        const encryptedPayload = encryptMessage(text);

        let mediaUrl = null;
        if (mediaFile) {
            // В реальном проекте здесь будет логика загрузки файла на S3/Storage
            mediaUrl = `/uploads/${Date.now()}-${mediaFile.originalname}`; 
        }

        const newMessage = new Message({
            chatId,
            senderId,
            text: encryptedPayload.encryptedText, // Сохраняем зашифрованный текст
            mediaUrl: mediaUrl
        });

        await newMessage.save();

        res.status(201).json({ 
            messageId: newMessage._id,
            text: "Сообщение успешно сохранено (зашифровано)"
        });

    } catch (error) {
        console.error('Ошибка при сохранении сообщения:', error);
        res.status(500).json({ message: 'Ошибка сервера при сохранении.' });
    }
});


// --- 5. СОБЫТИЯ SOCKET.IO (Сигнализация WebRTC) ---
io.on('connection', (socket) => {
    console.log(`[Socket] Пользователь подключен: ${socket.id}`);

    // Событие для отправки сообщения
    socket.on('send_message', async (messageData) => {
        const { chatId, senderId, text, mediaFile } = messageData;

        try {
            // 1. ШИФРОВАНИЕ
            const encryptedPayload = encryptMessage(text);

            let mediaUrl = null;
            if (mediaFile) {
                mediaUrl = `/uploads/${Date.now()}-${mediaFile.originalname}`; 
            }

            // 2. СОХРАНЕНИЕ В БД
            const newMessage = new Message({
                chatId,
                senderId,
                text: encryptedPayload.encryptedText,
                mediaUrl: mediaUrl
            });
            await newMessage.save();

            // 3. ОТПРАВКА СООБЩЕНИЯ ВСЕМ УЧАСТНИКАМ ЧАТА (Real-Time)
            io.to(chatId).emit('new_message', {
                sender: senderId,
                text: mediaUrl ? `[Медиа]: ${mediaFile.originalname}` : "Сообщение получено!",
                encryptedData: { encryptedText: encryptedPayload.encryptedText, iv: encryptedPayload.iv },
                mediaUrl: mediaUrl // Отправляем ссылку на медиа
            });

        } catch (error) {
            console.error("Ошибка при обработке сообщения:", error);
            socket.emit('message_error', 'Ошибка сервера при отправке.');
        }
    });


    // --- WebRTC Сигнализация ---
    socket.on('call_request', (data) => {
        console.log(`[CALL] ${socket.id} запросил звонок к ${data.targetId}`);
        io.to(data.targetId).emit('incoming_call', { callerId: socket.id });
    });

    socket.on('webrtc_signal', (signalData) => {
        // Пересылаем SDP/ICE от одного участника к другому
        io.to(signalData.targetId).emit('webrtc_signal', { 
            senderId: socket.id, 
            signal: signalData.signalData 
        });
    });

    socket.on('webrtc_answer', (data) => {
        // Подтверждение от получателя
        io.to(data.callerId).emit('webrtc_call_accepted', { status: 'accepted' });
    });


    socket.on('disconnect', () => {
        console.log(`[Socket] Пользователь отключен: ${socket.id}`);
    });
});


// --- 6. ЗАПУСК СЕРВЕРА ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Backend Server запущен на порту ${PORT}`));
