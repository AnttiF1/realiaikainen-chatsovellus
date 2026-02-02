import { useState, useEffect, useRef } from 'react';  //
import io from 'socket.io-client';  
import RoomSelector from './components/RoomSelector';  // Huonevalitsin
import ChatMessages from './components/ChatMessages';  // Viestilista
import MessageInput from './components/MessageInput';  // Viestin syöttö
import './App.css';  


// YHDISTÄ BACKENDIIN (portti 3001)
const socket = io('http://localhost:3001');

function App() {
  // TILA: Käyttäjätiedot ja viestit
  const [username, setUsername] = useState('');  // Nimimerkki
  const [room, setRoom] = useState('yleinen');  // Nykyinen huone
  const [messages, setMessages] = useState([]);  // Kaikki viestit
  const [isConnected, setIsConnected] = useState(false);  // Socket-status
  const messagesEndRef = useRef(null);  // Scroll-ankkuri

  // SCROLL ALAS UUSILLE VIESTEILLE
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
    
    // Virhe backendiltä
    socket.on('errorMessage', (error) => {
      alert(error.message);
    });
    
    // Järjestelmäilmoitus (esim. "Leevi liittyi")
    socket.on('systemMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // PUHDISTUS: Poista listenerit komponentti katoaa
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomHistory');
      socket.off('newMessage');
      socket.off('errorMessage');
      socket.off('systemMessage');
    };
  }, []);  // Tyhjä riippuvuus = aja vain kerran


  // SCROLL UUSILLE VIESTEILLE
  useEffect(() => {
    scrollToBottom();
  }, [messages]);  // Kun messages muuttuu → scroll


  // LIITY HUONESEEN
  const joinRoom = (newRoom, user) => {
    console.log('Liitytään:', newRoom, user);
    socket.emit('joinRoom', { room: newRoom, user });  // Lähetä backendille
    setRoom(newRoom);
    setUsername(user);
    scrollToBottom();
  };


  // LÄHETÄ VIESTI
  const sendMessage = (text) => {
    console.log('Lähetetään:', text);
    socket.emit('sendMessage', { text });  // Backend muotoilee + lähettää kaikille
  };


  // POISTU CHATISTA (takaisin login)
  const leaveChat = () => {
    socket.emit('leaveRoom');
    setUsername('');
    setMessages([]);
    setRoom('yleinen');
  };


  // LOGIN-NÄKYMÄ (ennen liittymistä)
  if (!username) {
    return (
      <div className="login-container">
        <h1>Liity chattiin</h1>
        {/* STATUS HEADER */}
        <header style={{fontSize: '0.9em', color: 'gray'}}>
          Yhteys: {isConnected ? '✅' : '❌'} | Huone: {room}
        </header>
        <input
          type="text"
          placeholder="Nimimerkki (tyhjä=Anonymous)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const name = e.target.value.trim() || 'Anonymous';  // NIMETTÖMÄ OK!
              joinRoom(room, name);
            }
          }}
        />
        <RoomSelector room={room} setRoom={setRoom} />
      </div>
    );
  }


  // CHAT-NÄKYMÄ (kun liitytty)
  return (
    <div className="app">
      {/* HEADER: Status + huone + poistuminen */}
      <header>
        Yhteys: {isConnected ? '✅' : '❌'} | Huone: {room} | {username}
        <button onClick={leaveChat} style={{float: 'right'}}>
          🚪 Poistu chattiin
        </button>
      </header>
      
      {/* HUONEVALITSEJA */}
      <RoomSelector room={room} setRoom={(newRoom) => joinRoom(newRoom, username)} />
      
      {/* VIESTILISTA */}
      <ChatMessages messages={messages} />
      
      {/* VIESTIN SYÖTTÖ */}
      <MessageInput sendMessage={sendMessage} />
      
      {/* SCROLL-ANKKURI (piilotettu) */}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default App;
