'use client';

import { Doughnut } from 'react-chartjs-2';
import { chartOptions, chartColors } from '@/lib/charts/config';

interface DoughnutChartProps {
  data: {
    labels: string[];
    values: number[];
  };
  title?: string;
  centerText?: string;
  height?: number;
}

export default function DoughnutChart({
  data,
  title,
  centerText,
  height = 300,
}: DoughnutChartProps) {
  const total = data.values.reduce((a, b) => a + b, 0);

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.success,
          chartColors.warning,
        ].slice(0, data.labels.length),
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
            font: { size: 16, weight: 'bold' as const },  // ← Fixed here
          }
        : undefined,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '60%',
  };

  return (
    <div style={{ height, position: 'relative' }}>
      <Doughnut data={chartData} options={options} />
      {centerText && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: chartColors.primary,
          }}
        >
          {centerText}
        </div>
      )}
    </div>
  );
}