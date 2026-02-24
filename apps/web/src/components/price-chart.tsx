"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi } from "lightweight-charts";

interface PriceChartProps {
  mint: string;
}

export function PriceChart({ mint }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: containerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        borderColor: "#374151",
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: "#22c55e",
          width: 1,
          style: 2,
          labelBackgroundColor: "#22c55e",
        },
        horzLine: {
          color: "#22c55e",
          width: 1,
          style: 2,
          labelBackgroundColor: "#22c55e",
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    // Generate sample data (replace with real data from API)
    const now = Math.floor(Date.now() / 1000);
    const sampleData = [];
    let basePrice = 0.00001;

    for (let i = 0; i < 100; i++) {
      const time = now - (100 - i) * 60; // 1-minute candles
      const open = basePrice;
      const close = basePrice * (1 + (Math.random() - 0.45) * 0.1);
      const high = Math.max(open, close) * (1 + Math.random() * 0.05);
      const low = Math.min(open, close) * (1 - Math.random() * 0.05);

      sampleData.push({
        time: time as any,
        open,
        high,
        low,
        close,
      });

      basePrice = close;
    }

    candlestickSeries.setData(sampleData);

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: "#22c55e50",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    const volumeData = sampleData.map((d, i) => ({
      time: d.time,
      value: Math.random() * 10000,
      color: d.close >= d.open ? "#22c55e50" : "#ef444450",
    }));

    volumeSeries.setData(volumeData);

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    // Fit content
    chart.timeScale().fitContent();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [mint]);

  return (
    <div ref={containerRef} className="w-full" />
  );
}
