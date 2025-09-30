'use client';

import { useState, useCallback, useEffect } from 'react';
import { Notification } from '@/components/notification-system';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 알림 추가
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // 브라우저 알림 (권한이 있는 경우)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }

    return newNotification.id;
  }, []);

  // 알림 읽음 처리
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // 읽지 않은 알림 모두 읽음 처리
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // 알림 삭제
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // 모든 알림 삭제
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 읽은 알림만 삭제
  const clearReadNotifications = useCallback(() => {
    setNotifications(prev => prev.filter(notification => !notification.read));
  }, []);

  // 해양 운항 관련 알림 생성
  const addMarineNotification = useCallback((
    decision: string,
    waveHeight: number,
    windSpeed: number,
    priority: Notification['priority'] = 'medium'
  ) => {
    let title = '';
    let message = '';
    let type: Notification['type'] = 'info';

    switch (decision) {
      case 'Go':
        title = '출항 승인';
        message = `파고 ${waveHeight}m, 풍속 ${windSpeed}kt - 안전한 출항 조건입니다.`;
        type = 'success';
        break;
      case 'Conditional Go':
        title = '조건부 출항';
        message = `파고 ${waveHeight}m, 풍속 ${windSpeed}kt - 주의 깊은 운항이 필요합니다.`;
        type = 'warning';
        break;
      case 'Conditional Go (coastal window)':
        title = '연안 창 출항';
        message = `파고 ${waveHeight}m, 풍속 ${windSpeed}kt - 연안 구간에서만 운항 가능합니다.`;
        type = 'warning';
        break;
      case 'No-Go':
        title = '출항 금지';
        message = `파고 ${waveHeight}m, 풍속 ${windSpeed}kt - 위험한 조건으로 출항이 금지됩니다.`;
        type = 'error';
        break;
      default:
        title = '운항 상태 업데이트';
        message = `파고 ${waveHeight}m, 풍속 ${windSpeed}kt - 운항 상태가 변경되었습니다.`;
        type = 'info';
    }

    return addNotification({
      type,
      title,
      message,
      priority
    });
  }, [addNotification]);

  // 기상 경보 알림 생성
  const addWeatherAlert = useCallback((
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) => {
    const priorityMap = {
      low: 'low' as const,
      medium: 'medium' as const,
      high: 'high' as const,
      critical: 'critical' as const
    };

    let title = '';
    let message = '';
    let type: Notification['type'] = 'warning';

    switch (alertType) {
      case 'High seas':
        title = '대형 파도 경보';
        message = '대형 파도가 예상됩니다. 출항을 연기하세요.';
        type = 'error';
        break;
      case 'Fog':
        title = '안개 경보';
        message = '안개로 인한 가시거리 저하가 예상됩니다.';
        type = 'warning';
        break;
      case 'rough at times westward':
        title = '서쪽 파도 주의';
        message = '서쪽 방향으로 파도가 거칠어질 수 있습니다.';
        type = 'warning';
        break;
      default:
        title = '기상 경보';
        message = `${alertType} 경보가 발령되었습니다.`;
    }

    return addNotification({
      type,
      title,
      message,
      priority: priorityMap[severity]
    });
  }, [addNotification]);

  // 시스템 상태 알림
  const addSystemNotification = useCallback((
    status: 'connected' | 'disconnected' | 'error',
    message?: string
  ) => {
    let title = '';
    let type: Notification['type'] = 'info';
    let priority: Notification['priority'] = 'medium';

    switch (status) {
      case 'connected':
        title = '시스템 연결됨';
        message = message || '실시간 데이터 스트림이 연결되었습니다.';
        type = 'success';
        priority = 'low';
        break;
      case 'disconnected':
        title = '시스템 연결 끊김';
        message = message || '실시간 데이터 스트림 연결이 끊어졌습니다.';
        type = 'warning';
        priority = 'high';
        break;
      case 'error':
        title = '시스템 오류';
        message = message || '시스템 오류가 발생했습니다.';
        type = 'error';
        priority = 'critical';
        break;
    }

    return addNotification({
      type,
      title,
      message: message || '',
      priority
    });
  }, [addNotification]);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    addNotification,
    addMarineNotification,
    addWeatherAlert,
    addSystemNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    clearReadNotifications
  };
}
