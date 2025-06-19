import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const chartColors = {
  americas: '#00D9FF',
  europe: '#FF4444',
  greaterChina: '#00FF88',
  japan: '#FFA500',
  restOfAsia: '#4169E1',
  asiaPacific: '#9966FF',
  iphone: '#00D9FF',
  mac: '#FF4444',
  ipad: '#00FF88',
  wearables: '#FFA500',
  services: '#4169E1',
};

export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#CCCCCC',
        font: {
          family: 'monospace',
          size: 11,
        },
      },
    },
    title: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        color: '#333333',
        borderColor: '#333333',
      },
      ticks: {
        color: '#888888',
        font: {
          family: 'monospace',
          size: 10,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: '#333333',
        borderColor: '#333333',
      },
      ticks: {
        color: '#888888',
        font: {
          family: 'monospace',
          size: 10,
        },
        callback: function(value: any) {
          return '$' + value + 'B';
        },
      },
    },
  },
};