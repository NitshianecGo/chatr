import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// --- 1. КОНСТАНТЫ И СТИЛИ (Для чистоты кода) ---

const SOCKET_SERVER_URL = "http://localhost:3000"; // Адрес вашего Node.js сервера

// --- 2. МОДУЛЬ ШИФРОВАНИЯ (Встроенный для простоты) ---
const SECRET_KEY = 'ВАШ_СЕКРЕТНЫЙ_КЛЮЧ_ДЛЯ_ШИФРОВАНИЯ_AES256'; // !!! ЗАМЕНИТЕ ЭТОТ КЛЮЧ !!!

function encryptMessage(text) {
    const crypto = require('crypto'); // В реальном проекте импортируйте, но для одного файла можно использовать inline-логику или убедиться, что модуль доступен.
    const iv = crypto.randomBytes(16); 
    const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
        encryptedText: encrypted,
        iv: iv.toString('hex')
    };
}

function decryptMessage(encryptedData) {
    const crypto = require('crypto'); 
    const { encryptedText, iv } = encryptedData;
    const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, Buffer.from(iv, 'hex'));

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}


// --- 3. КОМПОНЕНТ ЧАТА (Основной компонент) ---

function CyberChatApp() {
    const [chatId, setChatId] = useState(''); // ID чата из ссылки
    const [currentUserId, setCurrentUserId] = useState('userA'); // Ваш ID для теста
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    // Реф для прокрутки к последнему сообщению
    const messagesEndRef = useRef(null);

    // --- 4. СОЕДИНЕНИЕ С SOCKET.IO (Реальное время) ---
    useEffect(() => {
        // Подключение к серверу
        const socket = io(SOCKET_SERVER_URL);
        
        socket.on('connect', () => {
            console.log('✅ Socket.io: Соединение с сервером установлено.');
            setIsConnected(true);
        });

        socket.on('new_message', (message) => {
            console.log("Получено новое сообщение:", message);
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        socket.on('connect_error', (err) => {
            console.error('❌ Socket.io: Ошибка подключения:', err);
            setIsConnected(false);
        });

        // Отправка сообщения на сервер
        const sendMessage = async () => {
            if (messageInput.trim() === '' || !chatId) return;

            const messageData = {
                chatId,
                senderId: currentUserId,
                text: messageInput,
            };
            
            socket.emit('send_message', messageData);
            setMessageInput('');
        };

        // Очистка слушателей при выходе из компонента
        return () => {
            socket.off('new_message');
            socket.off('connect');
        };
    }, [chatId, currentUserId]);


    // --- 5. ЛОГИКА ПРОКРУТКИ (Чтобы всегда было внизу) ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    // --- 6. ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЯ ---
    const handleSend = (e) => {
        e.preventDefault();
        if (messageInput.trim() === '') return;

        // Отправка сообщения через Socket.io
        socket.emit('send_message', {
            chatId,
            senderId: currentUserId,
            text: messageInput,
        });

        setMessageInput('');
    };


    // --- 7. РЕНДЕРИНГ (JSX и Неоновый Дизайн) ---
    return (
        <div className="cyber-container">
            {/* Заголовок с неоновым свечением */}
            <header className="neon-header">
                <h1>⚡ CyberChat</h1>
                <p>Чат: <span className="chat-id">{chatId}</span></p>
                <div className={`status ${isConnected ? 'online' : 'offline'}`}>
                    {isConnected ? '🟢 Онлайн' : '🔴 Офлайн'}
                </div>
            </header>

            {/* Область Сообщений */}
            <div className="message-list">
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`message ${msg.sender === currentUserId ? 'mine' : 'theirs'}`}
                    >
                        <span className="sender-name">{msg.sender}:</span>
                        <p className="message-text">
                            {/* Здесь происходит дешифровка для отображения */}
                            {msg.text.includes("Сообщение получено") ? (
                                <span className="decrypted-text">{msg.text}</span>
                            ) : (
                                // Если это реальное сообщение, здесь нужно вызвать decryptMessage(msg.encryptedData)
                                msg.text 
                            )}
                        </p>
                    </div>
                ))}
                <div ref={messagesEndRef} /> {/* Реф для прокрутки */}
            </div>

            {/* Поле Ввода с Неоновым Эффектом */}
            <form className="input-form" onSubmit={handleSend}>
                <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Введите сообщение для ${chatId}...`}
                    className="neon-input"
                />
                <button type="submit" className="neon-button">
                    ⚡ Отправить
                </button>
            </form>

        </div>
    );
}

// --- 8. СТИЛИ (Встроенный CSS для одного файла) ---
const styles = `
/* Общий контейнер - Темный фон */
.cyber-container {
    background-color: #0a0a1a; /* Глубокий темно-синий/черный */
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #e0f7fa; /* Светлый текст */
    padding: 20px;
}

/* Заголовок - Неоновый эффект */
.neon-header {
    text-align: center;
    margin-bottom: 30px;
    padding: 15px 30px;
    border-radius: 10px;
    background: rgba(255, 0, 255, 0.1); /* Легкий пурпурный фон */
    border: 2px solid #00FFFF; /* Цианная рамка */
    box-shadow: 0 0 15px #00FFFF, 0 0 30px rgba(0, 255, 255, 0.6); /* НЕОНОВЫЙ ЭФФЕКТ */
}

.neon-header h1 {
    color: #FF00FF; /* Маджента для заголовка */
    text-shadow: 0 0 8px #FF00FF, 0 0 20px #FF00FF;
}

.chat-id {
    color: #00FFFF;
    font-weight: bold;
}

/* Список Сообщений */
.message-list {
    flex-grow: 1;
    width: 90%;
    max-width: 800px;
    overflow-y: auto;
    padding: 20px;
    border: 1px solid rgba(0, 255, 255, 0.3); /* Легкая синяя рамка */
    border-radius: 15px;
    margin-bottom: 20px;
}

/* Индивидуальные сообщения */
.message {
    display: flex;
    margin-bottom: 15px;
    max-width: 85%;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.message.mine {
    justify-content: flex-end; /* Мои сообщения справа */
}

.message.theirs {
    justify-content: flex-start; /* Чужие сообщения слева */
}

.sender-name {
    color: #00FFFF; /* Неоновый цвет имени отправителя */
    font-weight: bold;
    margin-bottom: 3px;
}

.message-text {
    padding: 10px 15px;
    border-radius: 15px;
    word-wrap: break-word;
    line-height: 1.4;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); /* Легкое свечение сообщения */
}

.message.mine .message-text {
    background-color: rgba(0, 255, 255, 0.15); /* Светлый фон для своих сообщений */
    border-left: 4px solid #00FFFF;
}

.message.theirs .message-text {
    background-color: rgba(255, 0, 255, 0.15); /* Пурпурный фон для чужих сообщений */
    border-right: 4px solid #FF00FF;
}

/* Поле Ввода (Input) - Самый яркий элемент */
.input-form {
    width: 90%;
    max-width: 800px;
    display: flex;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05); /* Очень легкий полупрозрачный фон */
    border-radius: 30px;
    border: 2px solid #FF00FF; /* Пурпурная рамка */
}

.neon-input {
    flex-grow: 1;
    padding: 15px 20px;
    border: none;
    background: transparent;
    color: #e0f7fa;
    font-size: 16px;
    outline: none;
}

.neon-input:focus {
    box-shadow: 0 0 10px #00FFFF, 0 0 20px rgba(0, 255, 255, 0.8); /* Эффект свечения при фокусе */
}

/* Кнопка Отправки - Самый яркий элемент */
.neon-button {
    background: linear-gradient(45deg, #FF00FF, #00FFFF); /* Градиент от пурпурного к цианному */
    color: #1a1a3a; /* Темный текст для контраста */
    border: none;
    padding: 12px 25px;
    border-radius: 30px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 0 0 10px #FF00FF, 0 0 25px rgba(255, 0, 255, 0.8); /* Неоновый эффект кнопки */
}

.neon-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px #00FFFF, 0 0 35px #FF00FF; /* Усиление свечения при наведении */
}

/* Статус подключения */
.status {
    padding: 5px 15px;
    border-radius: 20px;
    font-weight: bold;
    margin-top: 10px;
}

.status.online {
    background-color: rgba(0, 255, 255, 0.2);
    color: #00FFFF;
    border: 1px solid #00FFFF;
}

.status.offline {
    background-color: rgba(255, 0, 255, 0.2);
    color: #FF00FF;
    border: 1px solid #FF00FF;
}
`;


// --- 9. ЭКСПОРТ КОМПОНЕНТА ---
export default CyberChatApp;
