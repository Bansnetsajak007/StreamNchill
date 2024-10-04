import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const ScreenShare = ({ socket, roomId }) => {
  const videoRef = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    // Initialize peer connection
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },  // Public STUN server
      ]
    });

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', { roomId, signal: event.candidate });
      }
    };

    // Handle track event when the remote peer sends media
    peerConnection.current.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    // Listen for signaling data from the other peer
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

    return () => {
      socket.off('signal');
    };
  }, [socket, roomId]);

  const startScreenShare = async () => {
    try {
      const displayMediaOptions = { video: { frameRate: 60 } };
      const screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      videoRef.current.srcObject = screenStream;

      // Add the screen track to the peer connection
      const videoTrack = screenStream.getVideoTracks()[0];
      screenStream.getTracks().forEach(track => peerConnection.current.addTrack(track, screenStream));

      // Create and send an offer to the other peer
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('signal', { roomId, signal: offer });
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  return (
    <div>
      <h2>Screen Sharing</h2>
      <video ref={videoRef} autoPlay playsInline style={{ width: '80%' }} />
      <button onClick={startScreenShare}>Start Screen Share</button>
    </div>
  );
};

// PropTypes validation
ScreenShare.propTypes = {
  socket: PropTypes.object.isRequired,
  roomId: PropTypes.string.isRequired,
};

export default ScreenShare;
