import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import RoomSelector from './components/RoomSelector';
import ChatMessages from './components/ChatMessages';
import MessageInput from './components/MessageInput';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('yleinen');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  // SCROLL FUNKTIO ENSIN
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // SOCKET LISTENERIT
  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('roomHistory', (data) => setMessages(data.messages || []));
    socket.on('newMessage', (data) => {
      setMessages((prev) => [...prev, data.message]);
    });
    socket.on('errorMessage', (error) => alert(error.message));
    socket.on('systemMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');  // ✅ Nyt mukana!
      socket.off('roomHistory');
      socket.off('newMessage');
      socket.off('errorMessage');
      socket.off('systemMessage');
    };
  }, []);

  // SCROLL UUSILLE VIESTEILLE
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const joinRoom = (newRoom, user) => {
    socket.emit('joinRoom', { room: newRoom, user });
    setRoom(newRoom);
    setUsername(user);
    scrollToBottom();  // ✅ Nyt funktio olemassa!
  };

  const sendMessage = (text) => {
    socket.emit('sendMessage', { text });
  };

  if (!username) {
    return (
      <div className="login-container">
        <h1>Liity chattiin</h1>
        <input
          type="text"
          placeholder="Nimimerkki"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              joinRoom(room, e.target.value);
            }
          }}
        />
        <RoomSelector room={room} setRoom={setRoom} />
      </div>
    );
  }

  return (
    <div className="app">
      <header>Yhteys: {isConnected ? '✅' : '❌'} | Huone: {room}</header>
      <RoomSelector room={room} setRoom={(newRoom) => joinRoom(newRoom, username)} />
      <ChatMessages messages={messages} />
      <MessageInput sendMessage={sendMessage} />
      <div ref={messagesEndRef} />
    </div>
  );
}

export default App;
