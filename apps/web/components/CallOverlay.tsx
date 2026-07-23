'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

  // ── Stable refs: always hold the latest value without re-running effects ──
  const activeApptIdRef = useRef<string | null>(null);
  const otherPartyIdRef = useRef<string>('');
  const callTypeRef = useRef<'audio' | 'video'>('audio');
  const callStateRef = useRef<'idle' | 'incoming' | 'calling' | 'connecting' | 'connected' | 'ended' | 'rejected'>('idle');
  const isCallerRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => { activeApptIdRef.current = activeApptId; }, [activeApptId]);
  useEffect(() => { otherPartyIdRef.current = otherPartyId; }, [otherPartyId]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Queue for ICE candidates arriving before remote description is set
  const candidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  // Buffer for signals arriving before PC is created (race condition fix)
  const pendingSignalsRef = useRef<any[]>([]);

  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  const getIceServers = (): RTCConfiguration => {
    const servers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnCredential = process.env.NEXT_PUBLIC_TURN_PASSWORD || process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    if (turnUrl) {
      servers.push({ urls: turnUrl, username: turnUsername || '', credential: turnCredential || '' });
    }
    return { iceServers: servers };
  };

  // ── Cleanup helper ──────────────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    stopRingtone();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    candidatesQueueRef.current = [];
    pendingSignalsRef.current = [];
    isCallerRef.current = false;
    setCallState('idle');
    setActiveApptId(null);
    setIsMuted(false);
    setShowVideoCall(false);
  }, []);

  // ── Ringtone ────────────────────────────────────────────────────────────────
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
    try { oscillatorRef.current?.stop(); } catch {}
    try { audioContextRef.current?.close(); } catch {}
    oscillatorRef.current = null;
    audioContextRef.current = null;
  };

  // ── Process a WebRTC signal (SDP or ICE candidate) ─────────────────────────
  const processSignal = useCallback(async (signalData: any) => {
    const pc = pcRef.current;
    if (!pc) {
      // Buffer it — PC not created yet (race condition)
      pendingSignalsRef.current.push(signalData);
      return;
    }

    try {
      const { sdp, candidate } = signalData;
      if (sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        if (sdp.type === 'offer') {
          // We're the answerer — create answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit('webrtc:signal', {
            appointmentId: activeApptIdRef.current,
            to: otherPartyIdRef.current,
            signalData: { sdp: answer },
          });
        }

        // Drain any queued ICE candidates now that remote description is set
        while (candidatesQueueRef.current.length > 0) {
          const cand = candidatesQueueRef.current.shift();
          if (cand) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
          }
        }
      } else if (candidate) {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        } else {
          candidatesQueueRef.current.push(candidate);
        }
      }
    } catch (err) {
      console.error('[CallOverlay] Error handling WebRTC signal:', err);
    }
  }, []);

  // ── WebRTC setup ────────────────────────────────────────────────────────────
  const startWebRTC = useCallback(async (isCaller: boolean, peerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(getIceServers());
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Remote audio
      pc.ontrack = (event) => {
        const audio = remoteAudioRef.current;
        if (audio && event.streams[0]) {
          audio.srcObject = event.streams[0];
          audio.play().catch((err) => console.warn('[CallOverlay] Audio play error:', err));
          setCallState('connected');
          callStateRef.current = 'connected';
        }
      };

      // ICE candidate forwarding
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('webrtc:signal', {
            appointmentId: activeApptIdRef.current,
            to: peerId,
            signalData: { candidate: event.candidate },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.warn('[CallOverlay] ICE connection failed');
          showToastRef.current('Call connection failed. Please retry.', 'error');
          cleanupCall();
        }
      };

      // Now process any signals that arrived before PC was created
      const buffered = [...pendingSignalsRef.current];
      pendingSignalsRef.current = [];
      for (const sig of buffered) {
        await processSignal(sig);
      }

      if (isCaller) {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('webrtc:signal', {
          appointmentId: activeApptIdRef.current,
          to: peerId,
          signalData: { sdp: offer },
        });
      }
      // If NOT caller: we wait for the offer to arrive via webrtc:signal
    } catch (err) {
      console.error('[CallOverlay] Failed to start WebRTC:', err);
      showToastRef.current('Microphone access is required for voice calls.', 'error');
      cleanupCall();
    }
  }, [cleanupCall, processSignal]);

  // ── Single persistent socket — created ONCE when user is available ──────────
  useEffect(() => {
    if (!user) return;

    const token =
      typeof window !== 'undefined'
        ? (JSON.parse(localStorage.getItem('docdock-auth') || sessionStorage.getItem('docdock-auth') || '{}') as any)?.accessToken
        : null;

    const SOCKET_BASE =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
      'http://localhost:4000';

    const socket = io(`${SOCKET_BASE}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    const joinRoom = () => {
      if (user?._id) {
        socket.emit('join', user._id);
      }
    };

    socket.on('connect', joinRoom);
    if (socket.connected) {
      joinRoom();
    }

    // ── Incoming call ─────────────────────────────────────────────────────────
    socket.on('call:incoming', (payload: {
      appointmentId: string;
      callerId: string;
      callerName: string;
      callType: 'audio' | 'video';
    }) => {
      if (callStateRef.current !== 'idle') {
        // Busy — auto-reject
        socket.emit('call:reject', { appointmentId: payload.appointmentId, callerId: payload.callerId });
        return;
      }
      setActiveApptId(payload.appointmentId);
      activeApptIdRef.current = payload.appointmentId;
      setCallerName(payload.callerName);
      setRemoteName(payload.callerName);
      setOtherPartyId(payload.callerId);
      otherPartyIdRef.current = payload.callerId;
      setCallType(payload.callType);
      callTypeRef.current = payload.callType;
      isCallerRef.current = false;
      setCallState('incoming');
      callStateRef.current = 'incoming';
      playRingtone();
    });

    // ── Call accepted by the callee ───────────────────────────────────────────
    socket.on('call:accepted', async (payload: { appointmentId: string; calleeId: string }) => {
      setOtherPartyId(payload.calleeId);
      otherPartyIdRef.current = payload.calleeId;
      stopRingtone();

      if (callTypeRef.current === 'video') {
        setCallState('connecting');
        callStateRef.current = 'connecting';
        setShowVideoCall(true);
      } else {
        setCallState('connecting');
        callStateRef.current = 'connecting';
        // Caller creates the offer
        await startWebRTC(true, payload.calleeId);
      }
    });

    // ── Call rejected ─────────────────────────────────────────────────────────
    socket.on('call:rejected', () => {
      stopRingtone();
      showToastRef.current('Call rejected by the other party.', 'error');
      setCallState('rejected');
      callStateRef.current = 'rejected';
      setTimeout(() => cleanupCall(), 3000);
    });

    // ── Remote hung up ────────────────────────────────────────────────────────
    socket.on('call:hungup', () => {
      showToastRef.current('Call ended.', 'info');
      setCallState('ended');
      callStateRef.current = 'ended';
      cleanupCall();
    });

    // ── WebRTC signaling ──────────────────────────────────────────────────────
    socket.on('webrtc:signal', (payload: { appointmentId: string; signalData: any; from: string }) => {
      processSignal(payload.signalData);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      stopRingtone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]); // Only re-run if the user changes (login/logout) — NOT on call state changes

  // ── Listen for locally-dispatched call initiation (from appointment pages) ──
  useEffect(() => {
    const handleInitiate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !socketRef.current || !user) return;

      setActiveApptId(detail.appointmentId);
      activeApptIdRef.current = detail.appointmentId;
      setRemoteName(detail.calleeName);
      setOtherPartyId(detail.calleeId);
      otherPartyIdRef.current = detail.calleeId;
      setCallType('audio');
      callTypeRef.current = 'audio';
      isCallerRef.current = true;
      setCallState('calling');
      callStateRef.current = 'calling';

      socketRef.current.emit('call:initiate', {
        appointmentId: detail.appointmentId,
        callerId: user._id,
        callerName: user.fullName,
        calleeId: detail.calleeId,
        callType: 'audio',
      });
    };

    const handleVideoInitiate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !socketRef.current || !user) return;

      setActiveApptId(detail.appointmentId);
      activeApptIdRef.current = detail.appointmentId;
      setRemoteName(detail.calleeName);
      setOtherPartyId(detail.calleeId);
      otherPartyIdRef.current = detail.calleeId;
      setCallType('video');
      callTypeRef.current = 'video';
      isCallerRef.current = true;
      setCallState('calling');
      callStateRef.current = 'calling';

      socketRef.current.emit('call:initiate', {
        appointmentId: detail.appointmentId,
        callerId: user._id,
        callerName: user.fullName,
        calleeId: detail.calleeId,
        callType: 'video',
      });
    };

    window.addEventListener('docdock:initiate-call', handleInitiate);
    window.addEventListener('docdock:initiate-video-call', handleVideoInitiate);
    return () => {
      window.removeEventListener('docdock:initiate-call', handleInitiate);
      window.removeEventListener('docdock:initiate-video-call', handleVideoInitiate);
    };
  }, [user]);

  // ── Call control handlers ───────────────────────────────────────────────────
  const handleAccept = async () => {
    stopRingtone();
    if (!socketRef.current || !activeApptIdRef.current || !user) return;

    socketRef.current.emit('call:accept', {
      appointmentId: activeApptIdRef.current,
      calleeId: user._id,
      callerId: otherPartyIdRef.current,
    });

    setCallState('connecting');
    callStateRef.current = 'connecting';

    if (callTypeRef.current === 'video') {
      setShowVideoCall(true);
    } else {
      // Callee: start WebRTC without being the offer creator
      await startWebRTC(false, otherPartyIdRef.current);
    }
  };

  const handleReject = () => {
    stopRingtone();
    if (!socketRef.current || !activeApptIdRef.current) return;
    socketRef.current.emit('call:reject', {
      appointmentId: activeApptIdRef.current,
      callerId: otherPartyIdRef.current,
    });
    cleanupCall();
  };

  const handleHangup = () => {
    if (socketRef.current && activeApptIdRef.current) {
      socketRef.current.emit('call:hangup', {
        appointmentId: activeApptIdRef.current,
        targetId: otherPartyIdRef.current,
      });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setIsMuted((m) => !m);
    }
  };

  // ── Render: video call overlay ──────────────────────────────────────────────
  if (showVideoCall) {
    return (
      <VideoConsultation
        appointmentId={activeApptIdRef.current!}
        peerId={otherPartyIdRef.current}
        peerName={remoteName || callerName}
        isCaller={isCallerRef.current}
        sharedSocket={socketRef.current}
        onClose={() => {
          setShowVideoCall(false);
          cleanupCall();
        }}
      />
    );
  }

  if (callState === 'idle') return null;

  // ── Render: audio call overlay ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-2xl space-y-6">

        {/* Avatar with pulse ring */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
          <div className={`absolute inset-0 rounded-full bg-emerald-400/20 ${callState === 'incoming' || callState === 'calling' ? 'animate-ping' : ''}`} />
          {callType === 'video' ? (
            <svg className="h-10 w-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="h-10 w-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
        </div>

        {/* Status text */}
        <div>
          <h3 className="text-xl font-bold text-slate-950 dark:text-white">
            {callState === 'incoming'
              ? (callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call')
              : callState === 'calling'
                ? (callType === 'video' ? 'Starting Video Call...' : 'Calling...')
                : callType === 'video' ? 'Video Call' : 'Voice Call'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">
            {remoteName || callerName || 'Assigned User'}
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-full inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {callState === 'incoming' && 'Ringing...'}
          {callState === 'calling' && 'Waiting for response...'}
          {callState === 'connecting' && 'Connecting...'}
          {callState === 'connected' && '● Connected'}
          {callState === 'ended' && 'Ended'}
          {callState === 'rejected' && 'Rejected'}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center items-center gap-4 pt-2">
          {callState === 'incoming' ? (
            <>
              {/* Accept */}
              <button
                onClick={handleAccept}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition transform hover:scale-105 active:scale-95"
                title="Accept"
              >
                {callType === 'video' ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Reject */}
              <button
                onClick={handleReject}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition transform hover:scale-105 active:scale-95"
                title="Reject"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* Mute (only when connected) */}
              {callState === 'connected' && (
                <button
                  onClick={toggleMute}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border transition transform hover:scale-105 active:scale-95 ${
                    isMuted
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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

              {/* Hang up */}
              <button
                onClick={handleHangup}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition transform hover:scale-105 active:scale-95"
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
