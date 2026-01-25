'use client';

import { Bar } from 'react-chartjs-2';
import { chartOptions, chartColors } from '@/lib/charts/config';

interface BarChartProps {
  data: {
    labels: string[];
    values: number[];
  };
  title?: string;
  horizontal?: boolean;
  height?: number;
}

export default function BarChart({
  data,
  title,
  horizontal = false,
  height = 300,
}: BarChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Count',
        data: data.values,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, chartColors.primary);
          gradient.addColorStop(1, chartColors.blue[2]);
          return gradient;
        },
        borderColor: chartColors.primary,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    ...chartOptions,
    indexAxis: horizontal ? ('y' as const) : ('x' as const),
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
            return `Count: ${context.parsed.y || context.parsed.x}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)',
        },
      },
      y: {
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}



