'use client';

import { Line } from 'react-chartjs-2';
import { chartOptions, chartColors } from '@/lib/charts/config';

interface LineChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color?: string;
    }[];
  };
  title?: string;
  height?: number;
}

export default function LineChart({ data, title, height = 300 }: LineChartProps) {
  const colors = [chartColors.primary, chartColors.success, chartColors.danger];

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.data,
      borderColor: dataset.color || colors[index % colors.length],
      backgroundColor: dataset.color || colors[index % colors.length],
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#fff',
      pointBorderWidth: 2,
    })),
  };

  const options = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: title
        ? {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' as const },  // ← Fixed here
          }
        : undefined,
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
      <Line data={chartData} options={options} />
    </div>
  );
}