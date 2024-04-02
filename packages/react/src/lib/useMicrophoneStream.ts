// cspell:ignore dataavailable
import { checkForAudioTracks, getAudioStream } from '@humeai/voice';
import { useCallback, useRef, useState } from 'react';

type PermissionStatus = 'prompt' | 'granted' | 'denied';

export const useMicrophoneStream = () => {
  const [permission, setPermission] = useState<PermissionStatus>('prompt');

  const streamRef = useRef<MediaStream | null>(null);

  const getStream = useCallback(async (deviceId: string | undefined) => {
    try {
      const stream = await getAudioStream(deviceId);

      setPermission('granted');
      streamRef.current = stream;

      checkForAudioTracks(stream);

      return 'granted' as const;
    } catch (e) {
      setPermission('denied');
      return 'denied' as const;
    }
  }, []);

  return {
    streamRef,
    getStream,
    permission,
  };
};
