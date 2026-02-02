import { useState, useEffect, useRef } from 'react';//useRef on kuin NUORA joka kiinnittyy HTML-elementtiin!
import io from 'socket.io-client';
import RoomSelector from './components/RoomSelector';
import ChatMessages from './components/ChatMessages';
import MessageInput from './components/MessageInput';
import './App.css';

// YHDISTÄ BACKENDIIN
const socket = io('http://localhost:3001');

function App() {
  // TILA: Käyttäjätiedot ja viestit
  const [username, setUsername] = useState('');  // Nimimerkki
  const [room, setRoom] = useState('yleinen');  // Nykyinen huone
  const [messages, setMessages] = useState([]);  // Kaikki viestit
  const [isConnected, setIsConnected] = useState(false);  // Socket-status
  const messagesEndRef = useRef(null);  // Scroll-ankkuri

  const [showChat, setShowChat] = useState(false);  // showChat on kuin KYTKIN joka päättää mikä näkymä näkyy!

  // SCROLLAA ALAS UUSILLE VIESTEILLE
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // SOCKET.LISTENERIT: Kuuntele backendin viestejä
  useEffect(() => {
    // Kun yhteys muodostuu
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // Kun liitytään huoneeseen: Lataa historia
    socket.on('roomHistory', (data) => {
      console.log('Historia saatu:', data.messages.length, 'viestiä');
      setMessages(data.messages || []);
    });
    
    // Uusi viesti huoneessa
    socket.on('newMessage', (data) => {
      console.log('Uusi viesti:', data.message.text);
      setMessages((prev) => [...prev, data.message]);
    });
    
    // Järjestelmäilmoitus (esim. "Leevi liittyi")
    socket.on('systemMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    
    // Virhe backendiltä
    socket.on('errorMessage', (error) => {
      alert(error.message);
    });

    // PUHDISTUS: Poista listenerit komponentti katoaa
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomHistory');
      socket.off('newMessage');
      socket.off('systemMessage');
      socket.off('errorMessage');
    };
  }, []);

  // SCROLL UUSILLE VIESTEILLE
  useEffect(() => {
    scrollToBottom();
  }, [messages]);  // Kun messages muuttuu → scroll

  // LIITY HUONESEEN
  const joinRoom = (newRoom, user) => {
    console.log('Liity:', newRoom, user);
    socket.emit('joinRoom', { room: newRoom, user });  // Lähetä backendille
    setRoom(newRoom);
    setUsername(user);
    setShowChat(true);
    scrollToBottom();
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
    socket.emit('sendMessage', { text });  // Backend muotoilee + lähettää kaikille
  };

  // LOGIN (ei liitytty)
    if (!showChat) {
    return (
        <div className="login-container">
        <h1>🎮 Reaaliaikainen Chat</h1>
        <label>Syötä nimimerkki:</label>
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
        <label>Valitse huone:</label>
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
    
    {/* HUONEVALITSIJA */}
    <div className="room-section">
      <label>Valitse huone:</label>
      <RoomSelector 
        room={room} 
        setRoom={(newRoom) => joinRoom(newRoom, username)} 
      />
    </div>
    
    {/* VIESTILISTA */}
    <div className="messages-section">
      <label>Viestit:</label>
      <ChatMessages messages={messages} />
    </div>
    
    {/* VIESTIN SYÖTTÖ */}
    <div className="input-section">
      <label>Lähetä viesti:</label>
      <MessageInput sendMessage={sendMessage} />
    </div>
  </div>
);
}
export default App;