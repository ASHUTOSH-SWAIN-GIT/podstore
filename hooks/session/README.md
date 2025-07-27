# Session Hooks - Modular Structure

This folder contains the refactored `useSessionControls` hook split into smaller, manageable modules for better maintainability and testing.

## File Structure

```
hooks/session/
├── index.ts           # Main entry point and hook orchestration
├── types.ts           # TypeScript interfaces and types
├── eventHandlers.ts   # LiveKit event handlers (participants, tracks)
├── recording.ts       # Recording functionality (MediaRecorder, chunking)
├── connection.ts      # Room connection and management
├── utils.ts           # Utility functions (formatting, video attachment)
└── actions.ts         # Session actions (toggle recording, mute, video, end session)
```

## Module Responsibilities

### `types.ts`
- Defines all TypeScript interfaces
- `SessionState` - Component state interface
- `SessionRefs` - Ref objects interface
- `SessionActions` - Available actions interface
- `SessionControls` - Complete hook return type

### `eventHandlers.ts`
- LiveKit room event handlers
- Participant connection/disconnection
- Track subscription/unsubscription
- Local track publishing
- Room disconnect handling

### `recording.ts`
- MediaRecorder setup and management
- Chunk-based recording with upload
- Recording stream management
- Error handling for recording

### `connection.ts`
- LiveKit room connection logic
- Token fetching and authentication
- Event listener setup
- Connection state management

### `utils.ts`
- Duration formatting
- Invite link copying
- Local video attachment
- Camera enablement

### `actions.ts`
- Session control actions
- Recording toggle
- Mute/unmute toggle
- Video on/off toggle
- Session ending and cleanup

### `index.ts`
- Main hook implementation
- State initialization
- Module orchestration
- Cleanup and effects

## Usage

The refactored hook maintains the same API as the original:

```typescript
import { useSessionControls } from "@/hooks/useSessionControls";

const {
  isRecording,
  isConnected,
  localVideoRef,
  remoteVideosRef,
  toggleRecording,
  connectToRoom,
  // ... all other properties
} = useSessionControls();
```

## Benefits

1. **Modularity**: Each file has a single responsibility
2. **Testability**: Individual modules can be tested in isolation
3. **Maintainability**: Changes are localized to specific functionality
4. **Readability**: Easier to understand and navigate
5. **Reusability**: Modules can potentially be reused in other contexts

## Development Notes

- Import paths remain unchanged for consuming components
- All TypeScript types are properly exported
- Error handling is preserved and distributed appropriately
- No breaking changes to the existing API
