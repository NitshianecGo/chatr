import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = "http://localhost:3000"; 

// --- 1. КОМПОНЕНТ ЧАТА (Основной компонент) ---

function CyberChatApp() {
    const [chatId, setChatId] = useState(''); // ID чата из ссылки
    const [currentUserId, setCurrentUserId] = useState('userA'); // Ваш ID для теста
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    // WebRTC Состояния
    const [localStream, setLocalStream] = useState(null); // Камера/Микрофон
    const [remoteStream, setRemoteStream] = useState(null); // Видео от собеседника
    const localVideoRef = useRef(null); // Реф для элемента видеокамеры

    // --- 2. СОЕДИНЕНИЕ С SOCKET.IO (Реальное время) ---
    useEffect(() => {
        const socket = io(SOCKET_SERVER_URL);
        
        socket.on('connect', () => {
            console.log('✅ Socket.io: Соединение с сервером установлено.');
            setIsConnected(true);
        });

        // Слушатель для получения новых сообщений (с дешифровкой)
        socket.on('new_message', (message) => {
            console.log("Получено новое сообщение:", message);
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        // WebRTC События
        socket.on('incoming_call', (data) => {
            console.log(`📞 Входящий звонок от ${data.callerId}`);
            startWebRTCCall(data.callerId);
        });

        socket.on('webrtc_signal', (signalData) => {
            // Получаем SDP/ICE данные для установки соединения
            console.log("Получен WebRTC сигнал:", signalData);
            handleWebRTCSignal(signalData);
        });

        socket.on('webrtc_call_accepted', (data) => {
            console.log(`📞 Звонок принят! Статус: ${data.status}`);
        });


        return () => {
            socket.off('new_message');
            socket.off('connect');
        };
    }, [chatId, currentUserId]);

    // --- 3. WEB RTC ФУНКЦИИ (Камера/Микрофон) ---

    const startLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Ошибка доступа к камере/микрофону:", err);
            alert("Не удалось получить доступ к камере/микрофону. Проверьте разрешения!");
        }
    };

    const startWebRTCCall = async (targetId) => {
        // 1. Получаем локальный поток для отправки
        if (!localStream) {
            await startLocalStream();
        }

        // 2. Создаем RTCPeerConnection
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Сервер для обмена сигналом
        });

        // 3. Добавляем локальный поток к соединению
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        localVideoRef.current.srcObject = localStream;

        // 4. Обработка входящего видео от собеседника
        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            console.log("✅ Видео от собеседника получено!");
        };

        // 5. Отправка SDP (Session Description Protocol)
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Отправляем Offer на сервер для пересылки собеседнику
        socket.emit('webrtc_signal', { 
            targetId: targetId, 
            signalData: { type: 'offer', sdp: pc.localDescription } 
        });
    };

    const handleWebRTCSignal = (signalData) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        if (signalData.type === 'offer') {
            pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
            pc.createAnswer().then(answer => {
                pc.setLocalDescription(answer);
                socket.emit('webrtc_signal', { 
                    targetId: signalData.senderId, 
                    signalData: { type: 'answer', sdp: pc.localDescription } 
                });
            });
        } else if (signalData.type === 'answer') {
            pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        }

        // Добавляем удаленный поток, если он есть
        if (signalData.remoteStream) {
             setRemoteStream(signalData.remoteStream);
             pc.addTrack(signalData.remoteStream.getVideoTracks()[0], signalData.remoteStream);
        }
    };


    // --- 4. РЕНДЕРИНГ (JSX и Неоновый Дизайн) ---
    return (
        <div className="cyber-container">
            {/* Заголовок */}
            <header className="neon-header">
                <h1>⚡ CyberChat</h1>
                <p>Чат: <span className="chat-id">{chatId}</span></p>
                <div className={`status ${isConnected ? 'online' : 'offline'}`}>
                    {isConnected ? '🟢 Онлайн' : '🔴 Офлайн'}
                </div>
            </header>

            {/* Область Видеозвонка */}
            <div className="video-area">
                <div className="video-box local-video-box">
                    <h3>Ваша Камера</h3>
                    <video ref={localVideoRef} autoPlay muted playsInline className="video-feed"></video>
                </div>
                <div className="video-box remote-video-box">
                    <h3>Собеседник ({chatId})</h3>
                    {remoteStream ? (
                        <video autoPlay playsInline className="video-feed remote-feed" src={remoteStream.src.mediaStream[0].src} />
                    ) : (
                        <div className="placeholder">Ожидание звонка...</div>
                    )}
                </div>
            </div>

            {/* Область Сообщений */}
            <div className="message-list">
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`message ${msg.sender === currentUserId ? 'mine' : 'theirs'}`}
                    >
                        <span className="sender-name">{msg.sender}:</span>
                        <p className="message-text">
                            {/* Отображение текста (дешифровка) */}
                            {msg.text.includes("Сообщение получено") ? (
                                <span className="decrypted-text">{msg.text}</span>
                            ) : (
                                msg.text 
                            )}
                        </p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Поле Ввода */}
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

/* Область Видеозвонка */
.video-area {
    display: flex;
    width: 90%;
    max-width: 1200px;
    justify-content: space-around;
    margin-bottom: 30px;
}

.video-box {
    flex: 1;
    text-align: center;
    padding: 15px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.video-box h3 {
    color: #FF00FF;
    margin-bottom: 10px;
}

.video-feed {
    width: 100%;
    height: 300px;
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.5);
    object-fit: cover; /* Чтобы видео заполняло контейнер */
}

.placeholder {
    width: 100%;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}

/* Список Сообщений */
.message-list {
    flex-grow: 1;
    width: 90%;
    max-width: 800px;
    overflow-y: auto;
    padding: 20px;
    border: 1px solid rgba(0, 255, 255, 0.3);
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
    justify-content: flex-end;
}

.message.theirs {
    justify-content: flex-start;
}

.sender-name {
    color: #00FFFF;
    font-weight: bold;
    margin-bottom: 3px;
}

.message-text {
    padding: 10px 15px;
    border-radius: 15px;
    word-wrap: break-word;
    line-height: 1.4;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
}

.message.mine .message-text {
    background-color: rgba(0, 255, 255, 0.15);
    border-left: 4px solid #00FFFF;
}

.message.theirs .message-text {
    background-color: rgba(255, 0, 255, 0.15);
    border-right: 4px solid #FF00FF;
}

/* Поле Ввода (Input) - Неоновый эффект */
.input-form {
    width: 90%;
    max-width: 800px;
    display: flex;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 30px;
    border: 2px solid #FF00FF;
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
    background: linear-gradient(45deg, #FF00FF, #00FFFF);
    color: #1a1a3a;
    border: none;
    padding: 12px 25px;
    border-radius: 30px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 0 0 10px #FF00FF, 0 0 25px rgba(255, 0, 255, 0.8);
}

.neon-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px #00FFFF, 0 0 35px #FF00FF;
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
