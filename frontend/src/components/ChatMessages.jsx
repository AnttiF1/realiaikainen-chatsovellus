function ChatMessages({ messages, endRef }) {
  return (
    <div className="messages">
      {messages.map((msg) => (  // ← id pakollinen nyt
        <div key={msg.id} className="message">
          <strong>{msg.user || msg.username}:</strong> {msg.text}
          <span className="timestamp">
            {new Date(msg.ts || msg.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

export default ChatMessages;
