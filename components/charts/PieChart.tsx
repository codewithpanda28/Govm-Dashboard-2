'use client';

import { Pie } from 'react-chartjs-2';
import { chartOptions, chartColors } from '@/lib/charts/config';

interface PieChartProps {
  data: {
    labels: string[];
    values: number[];
  };
  title?: string;
  height?: number;
}

export default function PieChart({ data, title, height = 300 }: PieChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: chartColors.blue.slice(0, data.labels.length),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: title
        ? {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' as const },
          }
        : undefined,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Pie data={chartData} options={options} />
    </div>
  );
}



