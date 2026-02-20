'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/hooks/use-analytics';
import { useAiLtvCac } from '@/hooks/use-ai-ltv-cac';
import { BarChart3, TrendingUp, DollarSign, Target } from 'lucide-react';



export default function AnalyticsPage() {
  const { data, isLoading, error } = useAnalytics();
  const { data: aiData, isLoading: aiLoading } = useAiLtvCac();

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
            <p className="text-slate-600 mt-2">Track LTV/CAC, revenue trends, and conversion metrics</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-red-600 mt-4">Error loading analytics data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-slate-600 mt-2">Track LTV/CAC, revenue trends, and conversion metrics</p>
        </div>
        <Button onClick={() => window.location.href = '/analytics/costs'}>
          Track Acquisition Cost
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-indigo-600" />
              Avg. LTV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data?.avgLtv?.toLocaleString() || '0'}</div>
            <p className="text-xs text-slate-500 mt-1">Customer Lifetime Value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              Avg. CAC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data?.avgCac?.toLocaleString() || '0'}</div>
            <p className="text-xs text-slate-500 mt-1">Customer Acquisition Cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              LTV:CAC Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.ltvCacRatio?.toFixed(1) || '0.0'}x</div>
            <p className="text-xs text-slate-500 mt-1">Higher is better</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              Revenue (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data?.revenue30d?.toLocaleString() || '0'}</div>
            <p className="text-xs text-slate-500 mt-1">From closed-won deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Simplified for now */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>LTV vs CAC Trend</CardTitle>
            <CardDescription>Comparison over last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p>Chart component coming soon</p>
              <p className="text-sm mt-2">Average LTV: ${data?.avgLtv?.toLocaleString() || '0'}</p>
              <p className="text-sm">Average CAC: ${data?.avgCac?.toLocaleString() || '0'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
            <CardDescription>Closed-won deals revenue</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p>Chart component coming soon</p>
              <p className="text-sm mt-2">Last 30 days: ${data?.revenue30d?.toLocaleString() || '0'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deal Conversion Funnel</CardTitle>
          <CardDescription>Stages from lead to closed-won</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data?.funnelData?.map((item) => (
              <div key={item.stage} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-b-0">
                <span className="capitalize text-slate-700">{item.stage.replace('_', ' ')}</span>
                <span className="font-medium text-slate-900">{item.count}</span>
              </div>
            )) || (
              <p className="text-slate-500 text-center py-4">No deal data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {aiData && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-indigo-700">AI Insights</span>
            </CardTitle>
            <CardDescription>AI-powered analysis of your LTV/CAC metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white p-4 border border-indigo-100">
              <h4 className="font-medium text-slate-800 mb-2">Summary</h4>
              <p className="text-slate-700">AI analysis of your LTV/CAC metrics shows {data?.ltvCacRatio?.toFixed(1) || '0.0'}x ratio</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-white p-4 border border-indigo-100">
                <h4 className="font-medium text-slate-800 mb-2">Strengths</h4>
                <ul className="list-disc pl-5 text-slate-700 space-y-1">
                  <li>Good LTV:CAC ratio</li>
                  <li>Steady revenue growth</li>
                  <li>Healthy deal pipeline</li>
                </ul>
              </div>
              <div className="rounded-lg bg-white p-4 border border-indigo-100">
                <h4 className="font-medium text-slate-800 mb-2">Recommendations</h4>
                <ul className="list-disc pl-5 text-slate-700 space-y-1">
                  <li>Consider increasing marketing spend</li>
                  <li>Focus on higher-value deals</li>
                  <li>Track acquisition costs more closely</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {aiLoading && (
        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>Analyzing your metrics...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-24 w-full bg-slate-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
