'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Scale,
  Lock,
  FileSearch,
} from 'lucide-react';

const reportCards = [
  {
    icon: Calendar,
    title: 'Daily FIR Report',
    description: 'Generate daily FIR summary report',
    href: '/reports/daily',
    color: 'text-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Monthly Crime Report',
    description: 'Comprehensive monthly crime analysis',
    href: '/reports/monthly',
    color: 'text-purple-600',
  },
  {
    icon: FileSearch,
    title: 'Custom Report Builder',
    description: 'Create custom reports with filters',
    href: '/reports/custom',
    color: 'text-green-600',
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate and export various reports</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title} className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Icon className={`h-8 w-8 ${report.color} mb-2`} />
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={report.href}>
                  <Button className="w-full">Generate Report</Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
