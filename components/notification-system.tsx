'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface NotificationSystemProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onClearRead: () => void;
}

export default function NotificationSystem({
  notifications,
  onMarkAsRead,
  onClearAll,
  onClearRead
}: NotificationSystemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'critical') return notification.priority === 'critical';
    return true;
  });

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📢';
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-500';
      case 'medium': return 'bg-blue-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <span>알림</span>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge className="bg-red-600 text-white animate-pulse">
                긴급 {criticalCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              className="bg-slate-700 hover:bg-slate-600"
            >
              {isExpanded ? '접기' : '펼치기'}
            </Button>
            {unreadCount > 0 && (
              <Button
                onClick={onClearRead}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                읽음 처리
              </Button>
            )}
            <Button
              onClick={onClearAll}
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              모두 삭제
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* 필터 버튼 */}
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => setFilter('all')}
              size="sm"
              className={filter === 'all' ? 'bg-cyan-600' : 'bg-slate-700'}
            >
              전체 ({notifications.length})
            </Button>
            <Button
              onClick={() => setFilter('unread')}
              size="sm"
              className={filter === 'unread' ? 'bg-cyan-600' : 'bg-slate-700'}
            >
              읽지 않음 ({unreadCount})
            </Button>
            <Button
              onClick={() => setFilter('critical')}
              size="sm"
              className={filter === 'critical' ? 'bg-cyan-600' : 'bg-slate-700'}
            >
              긴급 ({criticalCount})
            </Button>
          </div>

          {/* 알림 목록 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <p className="text-slate-400 text-center py-4">알림이 없습니다.</p>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    notification.read 
                      ? 'bg-slate-700/50 border-slate-600' 
                      : 'bg-slate-700 border-slate-500'
                  } hover:bg-slate-600`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-sm font-medium ${
                          notification.read ? 'text-slate-300' : 'text-white'
                        }`}>
                          {notification.title}
                        </h4>
                        <Badge className={`${getPriorityColor(notification.priority)} text-xs`}>
                          {notification.priority}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        )}
                      </div>
                      <p className={`text-xs ${
                        notification.read ? 'text-slate-400' : 'text-slate-300'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
