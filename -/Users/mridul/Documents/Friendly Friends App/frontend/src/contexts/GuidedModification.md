// This file documents the applied modifications:
// - Added periodic presence update in AuthContext so that users are marked online even when not on the Messages page.
// - Created a new global CallOverlay component at frontend/src/components/call/CallOverlay.jsx which polls /api/calls/pending for the logged-in user and shows an "Incoming Call" overlay with Accept/Reject buttons anywhere in the app (desktop-level notification). It also implements the callee-side WebRTC setup (answering and streaming) and allows ending the call.
// - Updated frontend/src/components/messages/Messages.jsx to:
//   * Remove its own presence polling (now handled by AuthContext) to avoid duplication.
//   * Remove its internal incoming-call polling/overlay (global CallOverlay handles this now).
//   * Keep outgoing call functionality and enhance WebRTC configuration (add multiple STUN servers and optional TURN from env, increase iceCandidatePoolSize) and better logging.
// - Updated frontend/src/contexts/AuthContext.jsx to start a background interval to POST /api/presence/update every 30s when a user is logged in, and clear it on unmount or logout.
// - Updated frontend/src/App.jsx to mount the new <CallOverlay /> for logged-in non-viewer users so that incoming calls prompt appears anywhere in the app.
