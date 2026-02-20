import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type RevenueData = {
  month: string;
  revenue: number;
  deals: number;
};

interface RevenueChartProps {
  data: RevenueData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
        <CardDescription>Revenue and closed deals per month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center border border-dashed border-slate-300 rounded-lg">
          <div className="text-center text-slate-500">
            <p className="font-medium mb-2">Chart: Monthly Revenue</p>
            <p className="text-sm">Install recharts for visualizations</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
