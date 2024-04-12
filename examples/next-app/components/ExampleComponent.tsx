'use client';

import type { EmotionScores } from '@humeai/voice';
import { useVoice } from '@humeai/voice-react';
import { useEffect, useMemo, useRef } from 'react';
import { match } from 'ts-pattern';

import { AudioInputSelect } from '@/components/AudioInputSelect';

function getTop3Expressions(expressionOutputs: EmotionScores) {
  return Object.entries(expressionOutputs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value]) => ({ name: key, score: value }));
}

const normalizeFft = (fft: number[]) => {
  const max = 2.5;
  const min = Math.min(...fft);

  // define a minimum possible value because we want the bar to have
  // a height even when the audio is off
  const minNormalizedValue = 0.01;
  return Array.from(fft).map((x) => {
    // normalize & avoid divide by zero
    const normalized = max === min ? max : (x - min) / (max - min);
    const lowerBounded = Math.max(minNormalizedValue, normalized);
    const upperBounded = Math.min(1, lowerBounded);
    return Math.round(upperBounded * 100);
  });
};

export const ExampleComponent = ({
  hostname,
  setHostname,
}: {
  hostname: string;
  setHostname: (hostname: string) => void;
}) => {
  const {
    connect,
    disconnect,
    fft: audioFft,
    status,
    isMuted,
    isPlaying,
    mute,
    readyState,
    unmute,
    messages,
    micFft,
    sendText,
    callDurationTimestamp,
    inputDevices,
    selectedInputDevice,
    changeInputDevice,
  } = useVoice();

  const initialMessageSent = useRef(false);

  useEffect(() => {
    if (!initialMessageSent.current && status.value === 'connected') {
      initialMessageSent.current = true;
      // sendText(
      //   'Please greet me as though I were a long lost friend from your childhood',
      // );
    }
    return () => {
      initialMessageSent.current = false;
    };
  }, [status.value, sendText]);

  const normalizedFft = useMemo(() => {
    return normalizeFft(audioFft);
  }, [audioFft]);

  const normalizedMicFft = useMemo(() => {
    return normalizeFft(micFft);
  }, [micFft]);

  const voiceMessages = useMemo(() => {
    return messages
      .map((message) => {
        if (message.type === 'assistant_message') {
          return {
            message: message.message,
            top3: getTop3Expressions(message.models.prosody?.scores ?? {}),
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [messages]);

  const voiceFftAnimation = (fft: number[]) => (
    <div className="grid h-32 grid-cols-1 grid-rows-2 p-4">
      <div className="flex items-end gap-1">
        {fft.map((val, i) => {
          return (
            <div
              key={`fft-top-${i}`}
              style={{ height: `${val}%` }}
              className={
                'w-2 rounded-full bg-neutral-500 transition-all duration-75'
              }
            ></div>
          );
        })}
      </div>
      <div className="flex items-start gap-1">
        {fft.map((val, i) => {
          return (
            <div
              key={`fft-bottom-${i}`}
              style={{ height: `${val}%` }}
              className={
                'w-2 rounded-full bg-neutral-500 transition-all duration-75'
              }
            ></div>
          );
        })}
      </div>
    </div>
  );

  const hostnameInput = (
    <label className="flex gap-2">
      Hostname
      <input
        className="p-2 text-gray-900"
        value={hostname}
        onChange={(e) => setHostname(e.target.value)}
      />
    </label>
  );

  return (
    <div>
      <div className={'font-light'}>
        <div>Duration: {callDurationTimestamp}</div>
        <div className="flex max-w-sm flex-col gap-4">
          {match(status.value)
            .with('connected', () => (
              <>
                <div>Connected to: {hostname}</div>

                <div className="flex gap-2">
                  <button
                    className="rounded border border-neutral-500 p-2"
                    onClick={() => {
                      disconnect();
                    }}
                  >
                    Disconnect
                  </button>

                  {isMuted ? (
                    <button
                      className="rounded border border-neutral-500 p-2"
                      onClick={() => unmute()}
                    >
                      Unmute mic
                    </button>
                  ) : (
                    <button
                      className="rounded border border-neutral-500 p-2"
                      onClick={() => mute()}
                    >
                      Mute mic
                    </button>
                  )}
                </div>

                <AudioInputSelect
                  inputDevices={inputDevices}
                  selectedInputDevice={selectedInputDevice}
                  changeInputDevice={changeInputDevice}
                />

                {voiceFftAnimation(normalizedFft)}
                {voiceFftAnimation(normalizedMicFft)}

                <div>Playing: {isPlaying ? 'true' : 'false'}</div>
                <div>Ready State: {readyState}</div>

                <div>
                  <div className={'font-medium'}>
                    All Messages ({messages.length})
                  </div>
                  <textarea
                    className={'w-full bg-black font-mono text-white'}
                    value={JSON.stringify(messages, null, 0)}
                    readOnly
                  ></textarea>
                </div>

                <div>
                  <div className={'font-medium'}>
                    Last transcript message received from voice:
                  </div>
                  {voiceMessages.length > 0 ? (
                    <div>
                      {JSON.stringify(
                        voiceMessages[voiceMessages.length - 1],
                        null,
                        2,
                      )}
                    </div>
                  ) : (
                    <div>No transcript available</div>
                  )}
                </div>
              </>
            ))
            .with('disconnected', () => (
              <>
                {hostnameInput}
                <button
                  className="rounded border border-neutral-500 p-2"
                  onClick={() => {
                    void connect();
                  }}
                >
                  Connect to voice
                </button>
              </>
            ))
            .with('connecting', () => (
              <button
                className="cursor-not-allowed rounded border border-neutral-500 p-2"
                disabled
              >
                Connecting...
              </button>
            ))
            .with('error', () => (
              <div className="flex flex-col gap-4">
                {hostnameInput}
                <button
                  className="rounded border border-neutral-500 p-2"
                  onClick={() => {
                    void connect();
                  }}
                >
                  Connect to voice
                </button>

                <div>
                  <span className="text-red-500">{status.reason}</span>
                </div>
              </div>
            ))
            .exhaustive()}
        </div>
      </div>
    </div>
  );
};
