'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  sparkline?: number[];
}

export default function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  sparkline,
}: StatsCardProps) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isPositive && <ArrowUp className="h-3 w-3 text-green-500" />}
            {isNegative && <ArrowDown className="h-3 w-3 text-red-500" />}
            {trend === 'neutral' && <TrendingUp className="h-3 w-3 text-gray-500" />}
            <span
              className={cn(
                isPositive && 'text-green-500',
                isNegative && 'text-red-500'
              )}
            >
              {Math.abs(change)}% {changeLabel || 'from previous period'}
            </span>
          </div>
        )}
        {sparkline && sparkline.length > 0 && (
          <div className="mt-4 h-12 w-full">
            <svg className="h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <polyline
                points={sparkline
                  .map((val, i) => {
                    const x = (i / (sparkline.length - 1)) * 100;
                    const y = 40 - (val / Math.max(...sparkline)) * 30;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
              />
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



