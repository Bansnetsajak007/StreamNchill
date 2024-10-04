import React, { useState } from 'react';
import PropTypes from 'prop-types';

const Chat = ({ socket, roomId }) => {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);

  const sendMessage = () => {
    socket.emit('chat-message', { roomId, message });
    setMessage('');
  };

  socket.on('chat-message', (msg) => {
    setChatLog((prev) => [...prev, msg]);
  });

  return (
    <div>
      <h2>Chat</h2>
      <div>
        {chatLog.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

// PropTypes validation
Chat.propTypes = {
  socket: PropTypes.object.isRequired,
  roomId: PropTypes.string.isRequired,
};

export default Chat;
