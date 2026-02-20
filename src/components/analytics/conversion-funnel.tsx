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
  // TODO: Add recharts for visualizations
  // For now, display data in a table
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Conversion Funnel</CardTitle>
        <CardDescription>Deals by stage with conversion rates</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Stage</th>
                  <th className="text-left py-2 font-medium">Deals</th>
                  <th className="text-left py-2 font-medium">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((stage) => (
                  <tr key={stage.stage} className="border-b last:border-b-0">
                    <td className="py-3">{stage.stage}</td>
                    <td className="py-3 font-medium">{stage.deals}</td>
                    <td className="py-3">{stage.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center border border-dashed border-slate-300 rounded-lg">
            <div className="text-center text-slate-500">
              <p className="font-medium mb-2">No data available</p>
              <p className="text-sm">Conversion funnel data will appear here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
