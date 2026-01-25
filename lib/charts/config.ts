import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        font: { size: 12 },
        padding: 15,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 12,
      titleFont: { size: 14 },
      bodyFont: { size: 12 },
    },
  },
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart' as const,
  },
};

export const chartColors = {
  primary: '#1d4ed8',
  secondary: '#9333ea',
  success: '#16a34a',
  warning: '#eab308',
  danger: '#dc2626',
  blue: ['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
  purple: ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#f3e8ff'],
  green: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#dcfce7'],
  red: ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'],
};



