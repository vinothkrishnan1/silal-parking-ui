import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useLanguage } from '../context/LanguageContext';

const VehicleFlowChart = ({ data }) => {
  const { t, language } = useLanguage();
  // Extracting data for the chart from the backend format
  const chartTimes = data?.map(item => item.time) || Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const chartEntries = data?.map(item => item.entries) || [];
  const chartExits = data?.map(item => item.exits) || [];
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#f3f4f6',
      textStyle: {
        color: '#111827',
        fontWeight: 'bold'
      }
    },
    legend: {
      data: [t('dashboard.enteredToday'), t('dashboard.exitedToday')],
      icon: 'circle',
      textStyle: {
        fontWeight: 'bold',
        color: '#6b7280'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartTimes,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280', fontWeight: 'bold' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#6b7280', fontWeight: 'bold' }
    },
    series: [
      {
        name: t('dashboard.enteredToday'),
        type: 'bar',
        stack: 'total',
        data: chartEntries,
        itemStyle: {
          color: '#121212',
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '60%'
      },
      {
        name: t('dashboard.exitedToday'),
        type: 'bar',
        stack: 'total',
        data: chartExits,
        itemStyle: {
          color: '#c6a87c',
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '60%'
      }
    ]
  };

  return (
    <div className={`h-full flex flex-col ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="flex-grow" style={{ minHeight: '300px' }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default VehicleFlowChart;
