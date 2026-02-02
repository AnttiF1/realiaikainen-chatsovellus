import { useState } from 'react';

function MessageInput({ sendMessage }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Kirjoita viesti..."
      />
      <button type="submit">Lähetä</button>
    </form>
  );
}

export default MessageInput;
