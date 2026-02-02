import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import RoomSelector from './components/RoomSelector';
import ChatMessages from './components/ChatMessages';
import MessageInput from './components/MessageInput';
import './App.css';

// YHDISTÄ BACKENDIIN
const socket = io('http://localhost:3001');

function App() {
  // KAIKKI TILA
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('yleinen');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // SOCKET KUUNNATTAVAT
  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('roomHistory', (data) => {
      console.log('Historia:', data.messages?.length || 0);
      setMessages(data.messages || []);
    });
    
    socket.on('newMessage', (data) => {
      console.log('Uusi viesti:', data.message.text);
      setMessages((prev) => [...prev, data.message]);
    });
    
    socket.on('systemMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    
    socket.on('errorMessage', (error) => {
      alert(error.message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomHistory');
      socket.off('newMessage');
      socket.off('systemMessage');
      socket.off('errorMessage');
    };
  }, []);

  // LIIVI HUONESEEN
  const joinRoom = (newRoom, user) => {
    console.log('Liity:', newRoom, user);
    socket.emit('joinRoom', { room: newRoom, user });
    setRoom(newRoom);
    setUsername(user);
    setShowChat(true);
  };

  // POISTU HUONEESTA
  const leaveRoom = () => {
    console.log('Poistutaan');
    socket.emit('leaveRoom');
    setShowChat(false);
    setMessages([]);
    setRoom('yleinen');
  };

  // LÄHETÄ VIESTI
  const sendMessage = (text) => {
    console.log('Lähetä:', text);
    socket.emit('sendMessage', { text });
  };

  // LOGIN (ei liitytty)
    if (!showChat) {
    return (
        <div className="login-container">
        <h1>🎮 Reaaliaikainen Chat</h1>
        <input
            type="text"
            placeholder="Nimimerkki (tyhjä=Anonymous)"
            onKeyDown={(e) => {
            if (e.key === 'Enter') {
                const name = e.target.value.trim() || 'Anonymous';  // ← TYHJÄ = Anonymous!
                joinRoom(room, name);
            }
            }}
        />
        <RoomSelector room={room} setRoom={setRoom} />
        <p style={{ fontSize: '0.8em', color: 'gray' }}>
            Yhteys: {isConnected ? '✅' : '❌'}
        </p>
        </div>
    );
    }
  // CHAT (liitytty)
  return (
    <div className="app">
      <header>
        🔗 {isConnected ? '✅' : '❌'} | 
        🏠 {room.toUpperCase()} | 
        👤 {username} | 
        <button onClick={leaveRoom}>🚪 Poistu</button>
      </header>
      
      <RoomSelector 
        room={room} 
        setRoom={(newRoom) => joinRoom(newRoom, username)} 
      />
      
      <ChatMessages messages={messages} />
      <MessageInput sendMessage={sendMessage} />
    </div>
  );
}

export default App;
