import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LtvCacData = {
  month: string;
  ltv: number;
  cac: number;
};

interface LtvCacChartProps {
  data: LtvCacData[];
}

export default function LtvCacChart({ data }: LtvCacChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LTV vs CAC Trend</CardTitle>
        <CardDescription>Lifetime Value vs Customer Acquisition Cost over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center border border-dashed border-slate-300 rounded-lg">
          <div className="text-center text-slate-500">
            <p className="font-medium mb-2">Chart: LTV vs CAC</p>
            <p className="text-sm">Install recharts for visualizations</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
