'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  hour: string
  count: number
}

interface AttendanceChartProps {
  data: DataPoint[]
}

function formatHour(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-56 animate-pulse rounded-lg bg-gray-100" />
  }

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
        No scan data yet
      </div>
    )
  }

  const chartData = data.map((d) => ({ ...d, label: formatHour(d.hour) }))

  return (
    <ResponsiveContainer width="100%" height={224}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          formatter={(v) => [v as number, 'Scans']}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
