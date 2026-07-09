'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/app/auth/auth-context';
import { useToast } from '@/app/auth/toast-provider';
import VideoConsultation from './VideoConsultation';

export default function CallOverlay() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'calling' | 'connecting' | 'connected' | 'ended' | 'rejected'>('idle');
  const [activeApptId, setActiveApptId] = useState<string | null>(null);
  const [callerName, setCallerName] = useState<string>('');
  const [remoteName, setRemoteName] = useState<string>('');
  const [otherPartyId, setOtherPartyId] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [showVideoCall, setShowVideoCall] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const candidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);

  const getIceServers = () => {
    const servers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' }
    ];
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || (process.env as any).TURN_URL;
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME || (process.env as any).TURN_USERNAME;
    const turnCredential = process.env.NEXT_PUBLIC_TURN_PASSWORD || process.env.NEXT_PUBLIC_TURN_CREDENTIAL || (process.env as any).TURN_PASSWORD || (process.env as any).TURN_CREDENTIAL;
    if (turnUrl) {
      servers.push({
        urls: turnUrl,
        username: turnUsername || '',
        credential: turnCredential || ''
      });
    }
    return { iceServers: servers };
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) return;

    const token =
      typeof window !== 'undefined'
        ? (JSON.parse(localStorage.getItem('docdock-auth') || sessionStorage.getItem('docdock-auth') || '{}') as any)?.accessToken
        : null;
    const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
    
    const socket = io(`${SOCKET_BASE}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', user._id);
    });

    // Handle incoming call request
    socket.on('call:incoming', (payload: { appointmentId: string; callerId: string; callerName: string; callType: 'audio' | 'video' }) => {
      if (callState !== 'idle') {
        // Busy: auto-reject
        socket.emit('call:reject', { appointmentId: payload.appointmentId, callerId: payload.callerId });
        return;
      }
      setActiveApptId(payload.appointmentId);
      setCallerName(payload.callerName);
      setRemoteName(payload.callerName);
      setOtherPartyId(payload.callerId);
      setCallType(payload.callType);
      setCallState('incoming');
      playRingtone();
    });

    // Handle call accepted by peer
    socket.on('call:accepted', async (payload: { appointmentId: string; calleeId: string }) => {
      setOtherPartyId(payload.calleeId);
      setCallState('connecting');
      stopRingtone();
      if (callType === 'video') {
        // Open the VideoConsultation overlay
        setShowVideoCall(true);
      } else {
        await startWebRTC(true, payload.calleeId);
      }
    });

    // Handle call rejected by peer
    socket.on('call:rejected', () => {
      setCallState('rejected');
      stopRingtone();
      showToast('Call rejected by the other party.', 'error');
      setTimeout(() => cleanupCall(), 3000);
    });

    // Handle peer hung up
    socket.on('call:hungup', () => {
      setCallState('ended');
      showToast('Call ended.', 'info');
      cleanupCall();
    });

    // Handle WebRTC signaling messages
    socket.on('webrtc:signal', async (payload: { appointmentId: string; signalData: any; from: string }) => {
      if (!pcRef.current) return;
      try {
        const { sdp, candidate } = payload.signalData;
        if (sdp) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          if (sdp.type === 'offer') {
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socketRef.current?.emit('webrtc:signal', {
              appointmentId: activeApptId,
              to: otherPartyId,
              signalData: { sdp: answer }
            });
          }
          // Process queued candidates
          while (candidatesQueueRef.current.length > 0) {
            const cand = candidatesQueueRef.current.shift();
            if (cand) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        } else if (candidate) {
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            candidatesQueueRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    return () => {
      socket.disconnect();
      stopRingtone();
    };
  }, [user, callState, activeApptId, otherPartyId, callType]);

  // Listen to local trigger events to initiate call
  useEffect(() => {
    const handleInitiate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !socketRef.current || !user) return;

      setActiveApptId(detail.appointmentId);
      setRemoteName(detail.calleeName);
      setOtherPartyId(detail.calleeId);
      setCallType('audio');
      setCallState('calling');

      socketRef.current.emit('call:initiate', {
        appointmentId: detail.appointmentId,
        callerId: user._id,
        callerName: user.fullName,
        calleeId: detail.calleeId,
        callType: 'audio'
      });
    };

    window.addEventListener('docdock:initiate-call', handleInitiate);
    return () => {
      window.removeEventListener('docdock:initiate-call', handleInitiate);
    };
  }, [user]);

  // WebRTC Setup helper
  const startWebRTC = async (isCaller: boolean, peerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(getIceServers());
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote audio stream
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch((err) => console.error('Audio play error:', err));
          setCallState('connected');
        }
      };

      // Handle ICE candidates forwarding
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('webrtc:signal', {
            appointmentId: activeApptId,
            to: peerId,
            signalData: { candidate: event.candidate }
          });
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('webrtc:signal', {
          appointmentId: activeApptId,
          to: peerId,
          signalData: { sdp: offer }
        });
      }
    } catch (err) {
      console.error('Failed to get media devices / establish WebRTC:', err);
      showToast('Microphone access is required for VoIP calls.', 'error');
      cleanupCall();
    }
  };

  // Synthesize Ringtone sound natively
  const playRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;
    } catch {}
  };

  const stopRingtone = () => {
    try {
      oscillatorRef.current?.stop();
      audioContextRef.current?.close();
    } catch {}
  };

  const handleAccept = async () => {
    stopRingtone();
    if (!socketRef.current || !activeApptId || !user) return;
    setCallState('connecting');
    socketRef.current.emit('call:accept', {
      appointmentId: activeApptId,
      calleeId: user._id,
      callerId: otherPartyId
    });
    if (callType === 'video') {
      setShowVideoCall(true);
    } else {
      await startWebRTC(false, otherPartyId);
    }
  };

  const handleReject = () => {
    stopRingtone();
    if (!socketRef.current || !activeApptId) return;
    socketRef.current.emit('call:reject', {
      appointmentId: activeApptId,
      callerId: otherPartyId
    });
    cleanupCall();
  };

  const handleHangup = () => {
    if (socketRef.current && activeApptId) {
      socketRef.current.emit('call:hangup', {
        appointmentId: activeApptId,
        targetId: otherPartyId
      });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const cleanupCall = () => {
    stopRingtone();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setCallState('idle');
    setActiveApptId(null);
    setIsMuted(false);
    setShowVideoCall(false);
  };

  if (showVideoCall) {
    return (
      <VideoConsultation
        appointmentId={activeApptId!}
        peerId={otherPartyId}
        peerName={callerName}
        isCaller={false} // Patient is always answerer here
        onClose={() => {
          setShowVideoCall(false);
          cleanupCall();
        }}
      />
    );
  }

  if (callState === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-2xl space-y-6">
        
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
          <div className={`absolute inset-0 rounded-full bg-emerald-400/20 ${callState === 'incoming' || callState === 'calling' ? 'animate-ping' : ''}`} />
          <svg className="h-10 w-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-950 dark:text-white">
            {callState === 'incoming' 
              ? (callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call') 
              : callState === 'calling' 
                ? 'Calling...' 
                : 'Active Call'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">
            {remoteName || callerName || 'Assigned User'}
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-full inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {callState === 'incoming' && 'Ringing...'}
          {callState === 'calling' && 'Waiting for response...'}
          {callState === 'connecting' && 'Connecting WebRTC...'}
          {callState === 'connected' && 'Connected'}
          {callState === 'ended' && 'Ended'}
          {callState === 'rejected' && 'Rejected'}
        </div>

        <div className="flex justify-center items-center gap-4 pt-2">
          {callState === 'incoming' ? (
            <>
              <button
                onClick={handleAccept}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition transform hover:scale-105 active:scale-95"
                title="Accept"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>

              <button
                onClick={handleReject}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition transform hover:scale-105 active:scale-95"
                title="Reject"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {callState === 'connected' && (
                <button
                  onClick={toggleMute}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border transition transform hover:scale-105 active:scale-95 ${
                    isMuted ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    {isMuted ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    )}
                  </svg>
                </button>
              )}

              <button
                onClick={handleHangup}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition transform hover:scale-105 active:scale-95"
                title="Hang up"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
