import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ScreenShare = ({ socket, roomId }) => {
  const videoRef = useRef(null);
  const peerConnection = useRef(null);
  const screenStream = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', { roomId, signal: event.candidate });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    socket.on('signal', async (data) => {
      if (data.signal.type === 'offer') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('signal', { roomId, signal: answer });
      } else if (data.signal.type === 'answer') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.signal));
      } else if (data.signal.candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.signal));
      }
    });

    // Stop sharing listener
    socket.on('stop-sharing', () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsSharing(false);
    });

    return () => {
      socket.off('signal');
      socket.off('stop-sharing');
    };
  }, [socket, roomId]);

  const startScreenShare = async () => {
    try {
      const displayMediaOptions = { video: { frameRate: 60 } };
      screenStream.current = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      videoRef.current.srcObject = screenStream.current;

      const videoTrack = screenStream.current.getVideoTracks()[0];
      screenStream.current.getTracks().forEach((track) => peerConnection.current.addTrack(track, screenStream.current));

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('signal', { roomId, signal: offer });
      setIsSharing(true);
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  const stopScreenShare = () => {
    const tracks = screenStream.current.getTracks();
    tracks.forEach((track) => track.stop());
    videoRef.current.srcObject = null;
    socket.emit('stop-sharing', roomId);
    setIsSharing(false);
  };

  return (
    <div>
      <h2>Screen Sharing</h2>
      <video ref={videoRef} autoPlay playsInline style={{ width: '80%' }} />
      {!isSharing ? (
        <button onClick={startScreenShare}>Start Screen Share</button>
      ) : (
        <button onClick={stopScreenShare}>Stop Screen Share</button>
      )}
    </div>
  );
};

ScreenShare.propTypes = {
  socket: PropTypes.object.isRequired,
  roomId: PropTypes.string.isRequired,
};

export default ScreenShare;
