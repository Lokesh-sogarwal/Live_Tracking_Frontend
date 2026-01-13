import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import API_BASE_URL from '../../../../utils/config';

export default function Chart() {
  const [chartData, setChartData] = useState({ dates: [], counts: [] });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API_BASE_URL}/data/get_data`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json();
          console.error("Error fetching chart data:", error);
          return;
        }

        const rawData = await res.json();
        console.log("Chart data fetched successfully:", rawData);

        // ✅ Use structured response
        const users = rawData.users || [];

        const dateCounts = {};
        users.forEach(user => {
          if (!user.created_date) return;

          const date = new Date(user.created_date);
          if (isNaN(date)) return;

          const formatted = date.toISOString().split('T')[0];
          dateCounts[formatted] = (dateCounts[formatted] || 0) + 1;
        });

        const dates = Object.keys(dateCounts).sort();
        const counts = dates.map(date => dateCounts[date]);

        setChartData({ dates, counts });
      } catch (error) {
        console.error("Fetch error:", error);
      }
    }

    fetchData();
  }, []);

  const option = {
    title: { text: 'Users Created Over Time' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: chartData.dates,
      axisLabel: { rotate: 45 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: chartData.counts,
        barWidth: 30,
        itemStyle: {
          color: '#007bff',
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px", width: "100%" }} />;
}
