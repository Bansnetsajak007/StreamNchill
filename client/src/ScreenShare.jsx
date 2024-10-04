import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ScreenShare = ({ socket, roomId }) => {
  const videoRef = useRef(null);
  const peerConnection = useRef(null);
  const screenStream = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    // Create RTCPeerConnection
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', { roomId, signal: event.candidate });
      }
    };

    // Handle incoming tracks
    peerConnection.current.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    // Signal handling from socket
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

  // Function to start screen sharing
  const startScreenShare = async () => {
    try {
      // Request display media with improved audio capture settings
      const displayMediaOptions = {
        video: { frameRate: { ideal: 60 } },
        audio: {
          echoCancellation: true, // Reduce echo
          noiseSuppression: true, // Reduce background noise
          autoGainControl: true,  // Adjust gain automatically
        },
      };

      screenStream.current = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      videoRef.current.srcObject = screenStream.current;

      // Add video and audio tracks to the peer connection
      screenStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, screenStream.current);
      });

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('signal', { roomId, signal: offer });
      setIsSharing(true);
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  // Function to stop screen sharing
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
