import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type FunnelStage = {
  stage: string;
  deals: number;
  percentage: number;
};

interface ConversionFunnelProps {
  data: FunnelStage[];
}

export default function ConversionFunnel({ data }: ConversionFunnelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Conversion Funnel</CardTitle>
        <CardDescription>Deals by stage with conversion rates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center border border-dashed border-slate-300 rounded-lg">
          <div className="text-center text-slate-500">
            <p className="font-medium mb-2">Chart: Conversion Funnel</p>
            <p className="text-sm">Install recharts for visualizations</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
