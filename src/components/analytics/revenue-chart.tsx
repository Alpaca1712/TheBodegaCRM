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
  // TODO: Add recharts for visualizations
  // For now, display data in a table
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
        <CardDescription>Revenue and closed deals per month</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Month</th>
                  <th className="text-left py-2 font-medium">Revenue</th>
                  <th className="text-left py-2 font-medium">Deals</th>
                  <th className="text-left py-2 font-medium">Avg Deal Size</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.month} className="border-b last:border-b-0">
                    <td className="py-3">{row.month}</td>
                    <td className="py-3 font-medium">${row.revenue.toLocaleString()}</td>
                    <td className="py-3">{row.deals}</td>
                    <td className="py-3">
                      ${row.deals > 0 ? (row.revenue / row.deals).toFixed(2) : '0.00'}
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
              <p className="text-sm">Revenue data will appear here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
