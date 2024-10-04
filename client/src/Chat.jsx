import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const Chat = ({ socket, roomId }) => {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);

  useEffect(() => {
    socket.on('chat-message', (message) => {
      setChatLog((prevLog) => [...prevLog, message]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, [socket]);

  const sendMessage = () => {
    if (message.trim() !== '') {
      socket.emit('chat-message', { roomId, message });
      setChatLog((prevLog) => [...prevLog, `You: ${message}`]);
      setMessage('');
    }
  };

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
        placeholder="Type a message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

Chat.propTypes = {
  socket: PropTypes.object.isRequired,
  roomId: PropTypes.string.isRequired,
};

export default Chat;
