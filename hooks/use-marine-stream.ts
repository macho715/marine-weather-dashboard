'use client';

import { useState, useEffect, useCallback } from 'react';

interface MarineStreamData {
  type: 'init' | 'update';
  timestamp: string;
  coordinates: { lat: number; lon: number };
  marine_decision?: {
    Hs_fused_m: string;
    W_fused_kt: string;
    decision: string;
    ETA_hours: string;
    buffer_min: number;
  };
  weather_summary?: {
    wave_height: string;
    wind_speed: string;
    visibility: string;
    temperature: string;
  };
  message?: string;
}

interface UseMarineStreamOptions {
  latitude: number;
  longitude: number;
  enabled?: boolean;
}

export function useMarineStream({ latitude, longitude, enabled = true }: UseMarineStreamOptions) {
  const [data, setData] = useState<MarineStreamData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const eventSource = new EventSource(`/api/marine-stream?lat=${latitude}&lon=${longitude}`);
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const streamData: MarineStreamData = JSON.parse(event.data);
        setData(streamData);
        setLastUpdate(new Date());
      } catch (err) {
        console.error('Error parsing stream data:', err);
        setError('데이터 파싱 오류');
      }
    };

    eventSource.onerror = (err) => {
      console.error('Stream error:', err);
      setError('연결 오류');
      setIsConnected(false);
    };

    return eventSource;
  }, [latitude, longitude, enabled]);

  useEffect(() => {
    const eventSource = connect();
    
    return () => {
      eventSource?.close();
      setIsConnected(false);
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    setError(null);
    connect();
  }, [connect]);

  return {
    data,
    isConnected,
    error,
    lastUpdate,
    reconnect
  };
}
