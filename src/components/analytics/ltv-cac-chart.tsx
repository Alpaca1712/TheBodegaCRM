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
  // TODO: Add recharts for visualizations
  // For now, display data in a table
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>LTV vs CAC Trend</CardTitle>
        <CardDescription>Lifetime Value vs Customer Acquisition Cost over time</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Month</th>
                  <th className="text-left py-2 font-medium">LTV</th>
                  <th className="text-left py-2 font-medium">CAC</th>
                  <th className="text-left py-2 font-medium">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.month} className="border-b last:border-b-0">
                    <td className="py-3">{row.month}</td>
                    <td className="py-3 font-medium">${row.ltv.toFixed(2)}</td>
                    <td className="py-3">${row.cac.toFixed(2)}</td>
                    <td className="py-3 font-medium">
                      <span className={row.ltv / row.cac >= 3 ? "text-green-600" : "text-amber-600"}>
                        {(row.ltv / row.cac).toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center border border-dashed border-slate-300 rounded-lg">
            <div className="text-center text-slate-500">
              <p className="font-medium mb-2">No data available</p>
              <p className="text-sm">LTV/CAC data will appear here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
