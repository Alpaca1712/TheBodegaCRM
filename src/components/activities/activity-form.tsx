'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  PhoneCall,
  Mail,
  Calendar,
  CheckSquare,
  FileText,
  Save,
  X,
  Clock,
} from 'lucide-react';
import { Activity } from '@/lib/api/activities';

const activityTypes = [
  { value: 'call', label: 'Call', icon: PhoneCall },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'task', label: 'Task', icon: CheckSquare },
  { value: 'note', label: 'Note', icon: FileText },
] as const;

const activitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['call', 'email', 'meeting', 'task', 'note']),
  description: z.string().optional(),
  contact_id: z.string().optional(),
  company_id: z.string().optional(),
  deal_id: z.string().optional(),
  due_date: z.string().optional(),
  completed: z.boolean().default(false),
});

type ActivityFormData = z.infer<typeof activitySchema>;

type ActivityFormProps = {
  initialData?: Partial<Activity>;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  onSubmit: (data: Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ error?: string }>;
  onCancel?: () => void;
  isLoading?: boolean;
};

export default function ActivityForm({
  initialData,
  contactId,
  companyId,
  dealId,
  onSubmit,
  onCancel,
  isLoading = false,
}: ActivityFormProps) {
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: initialData?.title || '',
      type: initialData?.type || 'call',
      description: initialData?.description || '',
      contact_id: initialData?.contact_id || contactId || '',
      company_id: initialData?.company_id || companyId || '',
      deal_id: initialData?.deal_id || dealId || '',
      due_date: initialData?.due_date || '',
      completed: initialData?.completed || false,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedType = watch('type'); // react-hook-form watch function
  const selectedTypeInfo = activityTypes.find(t => t.value === selectedType);

  const handleFormSubmit = async (data: ActivityFormData) => {
    setError('');
    
    const activityData = {
      ...data,
      contact_id: data.contact_id || undefined,
      company_id: data.company_id || undefined,
      deal_id: data.deal_id || undefined,
      due_date: data.due_date || undefined,
    };

    const result = await onSubmit(activityData);
    
    if (result.error) {
      setError(result.error);
    } else {
      reset();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {initialData ? 'Edit Activity' : 'Log New Activity'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {selectedTypeInfo && (
              <span className="inline-flex items-center gap-1">
                <selectedTypeInfo.icon className="h-4 w-4" />
                {selectedTypeInfo.label}
              </span>
            )}
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-700"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Activity Type
            </label>
            <div className="flex gap-2">
              {activityTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      const event = {
                        target: {
                          value: type.value,
                        },
                      };
                      register('type').onChange(event);
                    }}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" {...register('type')} />
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              id="title"
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter activity title"
              {...register('title')}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Add details about this activity"
              {...register('description')}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="due_date"
                  type="datetime-local"
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  {...register('due_date')}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  {...register('completed')}
                  disabled={isLoading}
                />
                <span>Mark as completed</span>
              </label>
            </div>
          </div>

          {(contactId || companyId || dealId) && (
            <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
              This activity will be linked to:
              <div className="mt-1 flex gap-2">
                {contactId && <span className="px-2 py-1 bg-slate-200 rounded text-xs">Contact</span>}
                {companyId && <span className="px-2 py-1 bg-slate-200 rounded text-xs">Company</span>}
                {dealId && <span className="px-2 py-1 bg-slate-200 rounded text-xs">Deal</span>}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isLoading ? 'Saving...' : (initialData ? 'Update Activity' : 'Save Activity')}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
