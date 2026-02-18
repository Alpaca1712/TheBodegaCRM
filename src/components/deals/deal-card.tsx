import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Calendar, Building, User } from 'lucide-react'
import type { Deal } from '@/lib/api/deals'

export interface DealCardProps {
  deal: Deal
  onDragStart?: (e: React.DragEvent, deal: Deal) => void
  onClick?: (deal: Deal) => void
}

export default function DealCard({ deal, onDragStart, onClick }: DealCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, deal)
    }
    // Set drag data for HTML5 drag and drop
    e.dataTransfer.setData('text/plain', deal.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleClick = () => {
    if (onClick) {
      onClick(deal)
    }
  }

  return (
    <Card 
      className="mb-3 hover:shadow-md transition-shadow cursor-pointer"
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
      onClick={handleClick}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-slate-900">{deal.title}</h3>
          {deal.value && (
            <Badge variant="outline" className="font-medium bg-blue-50 text-blue-700 border-blue-200">
              <DollarSign className="mr-1 h-3 w-3" />
              {deal.value.toLocaleString('en-US', {
                style: 'currency',
                currency: deal.currency || 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Badge>
          )}
        </div>
        
        {deal.probability !== null && (
          <div className="mb-2">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>Probability</span>
              <span className="font-medium">{deal.probability}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${deal.probability >= 70 ? 'bg-green-500' : deal.probability >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${deal.probability}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="space-y-1.5 text-sm text-slate-600">
          {deal.company_id && (
            <div className="flex items-center">
              <Building className="mr-2 h-3.5 w-3.5" />
              <span>Company</span>
            </div>
          )}
          
          {deal.contact_id && (
            <div className="flex items-center">
              <User className="mr-2 h-3.5 w-3.5" />
              <span>Contact</span>
            </div>
          )}
          
          {deal.expected_close_date && (
            <div className="flex items-center">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              <span>{new Date(deal.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
        </div>
        
        {deal.notes && (
          <div className="mt-2 pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-500 line-clamp-2">{deal.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
