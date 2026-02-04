import { useState, useEffect, useRef } from 'react'; //useRef on kuin NUORA joka kiinnittyy HTML-elementtiin!
import io from 'socket.io-client';
import RoomSelector from './components/RoomSelector';
import ChatMessages from './components/ChatMessages';
import MessageInput from './components/MessageInput';
import './App.css';
import useRateLimitBanner from './hooks/UseRateLimitBanner';

const URL = import.meta.env.VITE_SOCKET_URL  // Varmistaa että ympäristömuuttuja ladataan oikein

// YHDISTÄ BACKENDIIN
const socket = io(URL || 'http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');  // Nimimerkki
  const [room, setRoom] = useState('yleinen');  // Nykyinen huone
  const [messages, setMessages] = useState([]);  // Kaikki viestit
  const [isConnected, setIsConnected] = useState(false);  // Socket-status
  const messagesEndRef = useRef(null);  // Scroll-ankkuri

  const [showChat, setShowChat] = useState(false);  // showChat kytkin,  joka päättää mikä näkymä näkyy!

  const { banner, isRateLimited, secondsLeft } = useRateLimitBanner(socket);

  // SCROLLAA ALAS UUSILLE VIESTEILLE
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // SOCKET.LISTENERIT: Kuuntele backendin viestejä
  useEffect(() => {

    // Nimetyt handlerit -> voidaan poistaa täsmällisesti cleanupissa
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onRoomHistory = (data) => {
      console.log("Historia saatu:", data?.messages?.length || 0, "viestiä");
      setMessages(data?.messages || []);
      };
    const onNewMessage = (data) => {
      console.log("Uusi viesti:", data?.message?.text);
      setMessages((prev) => [...prev, data.message]);
    };
    const onSystemMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("roomHistory", onRoomHistory);
    socket.on("newMessage", onNewMessage);
    socket.on("systemMessage", onSystemMessage);

    // PUHDISTUS: Poista listenerit komponentti katoaa
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("roomHistory", onRoomHistory);
      socket.off("newMessage", onNewMessage);
      socket.off("systemMessage", onSystemMessage);
    };
  }, []);

  // SCROLL UUSILLE VIESTEILLE
  useEffect(() => {
    scrollToBottom();
  }, [messages]);  // Kun messages muuttuu → scroll

  // LIITY HUONESEEN
  const joinRoom = (newRoom, user) => {
    console.log('Liity:', newRoom, user);
    setMessages([]);
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


  // ------
  // RENDERÖI
  // ------

  // LOGIN (ei liitytty)
  if (!showChat) {
    return (
      <div className="login-container">
        <h1>Reaaliaikainen Chat</h1>

        <label>Anna nimimerkkisi:</label>
        <input
          type="text"
          placeholder="Nimimerkki (tyhjä=Anonymous)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const name = username.trim() || "Anonymous";
              joinRoom(room, name);
            }
          }}
        />

        <label>Valitse huone:</label>
        <RoomSelector room={room} setRoom={setRoom} />

        <button
          onClick={() => {
            const name = username.trim() || "Anonymous";
            joinRoom(room, name);
          }}
          disabled={!isConnected}
        >
          Liity huoneeseen
        </button>

        <p>Yhteys: {isConnected ? "✅" : "❌"}</p>
      </div>
    );
  }

  // CHAT (liitytty)
  return (
    <div className="app">
      <header>
        Yhdistetty: {isConnected ? "✅" : "❌"} | Huone: {room.toUpperCase()} | Käyttäjä:{" "}
        {username} <button onClick={leaveRoom}>Poistu</button>
      </header>

      {/* HUONEVALITSIJA */}
      <div className="room-section">
        <label>Valitse huone:</label>
        <RoomSelector room={room} setRoom={(newRoom) => joinRoom(newRoom, username)} />
      </div>

      {/* VIESTILISTA */}
      <div className="messages-section">
        <label>Viestit:</label>

        {/* TÄRKEÄ: scroll-ankkuri pitää olla viestilistan sisällä (tai sen scrollattavan containerin sisällä) */}
        <ChatMessages messages={messages} endRef={messagesEndRef} />
      </div>

      {banner && (
        <div className="banner">
          {banner} {isRateLimited ? `(odota ${secondsLeft}s)` : null}
        </div>
      )}

      {/* VIESTIN SYÖTTÖ */}
      <div className="input-section">
        <label>Lähetä viesti:</label>
        <MessageInput sendMessage={sendMessage} disabled={!isConnected || isRateLimited} />
      </div>
    </div>
  );

}

export default App;