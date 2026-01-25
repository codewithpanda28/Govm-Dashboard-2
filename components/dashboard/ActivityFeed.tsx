'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  user_name: string;
  table_name: string;
  created_at: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '➕';
      case 'UPDATE':
        return '✏️';
      case 'DELETE':
        return '🗑️';
      case 'LOGIN':
        return '🔐';
      case 'EXPORT':
        return '📥';
      default:
        return '📋';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
              >
                <span className="text-xl">{getActionIcon(activity.action)}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {activity.action} - {activity.table_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.user_name} •{' '}
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}



