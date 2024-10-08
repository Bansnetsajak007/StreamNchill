import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ScreenShare = ({ socket, roomId }) => {
  const videoRef = useRef(null);
  const peerConnection = useRef(null);
  const screenStream = useRef(null);
  const audioContext = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
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
      const displayMediaOptions = {
        video: {
          displaySurface: 'monitor',
          logicalSurface: true,
          cursor: 'always',
          frameRate: 30,
        },
        audio: true,
        surfaceSwitching: 'include',
        systemAudio: 'include',
        selfBrowserSurface: 'include',
      };

      screenStream.current = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      videoRef.current.srcObject = screenStream.current;

      // Initialize AudioContext
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();

      // Process audio tracks
      const audioTracks = screenStream.current.getAudioTracks();
      audioTracks.forEach((track) => {
        const mediaStreamSource = audioContext.current.createMediaStreamSource(new MediaStream([track]));
        const processedAudioDestination = audioContext.current.createMediaStreamDestination();
        mediaStreamSource.connect(processedAudioDestination);

        // Add the processed audio track to the peer connection
        const processedAudioTrack = processedAudioDestination.stream.getAudioTracks()[0];
        peerConnection.current.addTrack(processedAudioTrack, screenStream.current);
      });

      // Add video tracks to the peer connection
      screenStream.current.getVideoTracks().forEach((track) => {
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

  const stopScreenShare = () => {
    if (screenStream.current) {
      const tracks = screenStream.current.getTracks();
      tracks.forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (audioContext.current) {
      audioContext.current.close();
    }
    socket.emit('stop-sharing', roomId);
    setIsSharing(false);
  };

  // Fullscreen toggle function
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.mozRequestFullScreen) {
        videoRef.current.mozRequestFullScreen(); // Firefox
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen(); // Chrome, Safari, Opera
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen(); // IE/Edge
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen(); // Firefox
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen(); // Chrome, Safari, Opera
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen(); // IE/Edge
      }
    }
    setIsFullScreen(!isFullScreen);
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

      {/* Full-Screen Button */}
      <button onClick={toggleFullScreen}>
        {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
      </button>

      {/* Optional: Add Zoom functionality */}
      <button onClick={() => (videoRef.current.style.transform = 'scale(1.5)')}>Zoom In</button>
      <button onClick={() => (videoRef.current.style.transform = 'scale(1)')}>Reset Zoom</button>
    </div>
  );
};

ScreenShare.propTypes = {
  socket: PropTypes.object.isRequired,
  roomId: PropTypes.string.isRequired,
};

export default ScreenShare;
