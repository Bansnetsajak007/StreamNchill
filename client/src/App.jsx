import React, { useState } from 'react';
import io from 'socket.io-client';
import ScreenShare from './ScreenShare';
import Chat from './Chat';
import './index.css';

// const socket = io('http://localhost:3001');
const socket = io('https://streamnchillv1.onrender.com');

const App = () => {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [inRoom, setInRoom] = useState(false);

  const joinRoom = () => {
    if (roomId !== '' && userName !== '') {
      socket.emit('join-room', roomId, userName);
      setInRoom(true);
    }
  };

  return (
    <div>
      {!inRoom ? (
        <div>
          <input
            type="text"
            placeholder="Enter Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <ScreenShare socket={socket} roomId={roomId} />
          <Chat socket={socket} roomId={roomId} />
        </div>
      )}
    </div>
  );
};

export default App;
