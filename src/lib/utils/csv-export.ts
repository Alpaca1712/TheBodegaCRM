/**
 * Utility functions for CSV export
 */

/**
 * Convert array of objects to CSV string
 */
export function objectsToCSV<T extends Record<string, string | number | boolean | Date | null | undefined | string[]>>(
  data: T[], 
  columns: { key: keyof T; label: string }[]
): string {
  if (!data.length) return '';
  
  // Create header row
  const header = columns.map(col => `"${col.label}"`).join(',');
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      
      // Handle arrays
      if (Array.isArray(value)) {
        return `"${value.join(', ')}"`;
      }
      
      // Handle dates - check if it's a date string or Date object
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        // Try to format date string
        try {
          const date = new Date(value);
          return `"${date.toISOString()}"`;
        } catch {
          // fall through
        }
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '\"');
      return `"${stringValue}"`;
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Create blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(baseName: string, extension = 'csv'): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${baseName}-${dateStr}-${timeStr}.${extension}`;
}

/**
 * Export contacts to CSV
 */
export async function exportContactsToCSV(contacts: Record<string, any>[]): Promise<void> {
  const columns = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'source', label: 'Source' },
    { key: 'tags', label: 'Tags' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' },
  ];
  
  const csvContent = objectsToCSV(contacts, columns);
  const filename = generateFilename('contacts');
  downloadCSV(csvContent, filename);
}

/**
 * Export companies to CSV
 */
export async function exportCompaniesToCSV(companies: any[]): Promise<void> {
  const columns = [
    { key: 'name', label: 'Company Name' },
    { key: 'industry', label: 'Industry' },
    { key: 'website', label: 'Website' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'postal_code', label: 'Postal Code' },
    { key: 'country', label: 'Country' },
    { key: 'status', label: 'Status' },
    { key: 'tags', label: 'Tags' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' },
  ];
  
  const csvContent = objectsToCSV(companies, columns);
  const filename = generateFilename('companies');
  downloadCSV(csvContent, filename);
}

/**
 * Export deals to CSV
 */
export async function exportDealsToCSV(deals: Record<string, any>[]): Promise<void> {
  const columns = [
    { key: 'title', label: 'Deal Title' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'stage', label: 'Stage' },
    { key: 'value', label: 'Value' },
    { key: 'currency', label: 'Currency' },
    { key: 'probability', label: 'Probability (%)' },
    { key: 'close_date', label: 'Close Date' },
    { key: 'contact_name', label: 'Contact Name' },
    { key: 'company_name', label: 'Company Name' },
    { key: 'tags', label: 'Tags' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' },
  ];
  
  const csvContent = objectsToCSV(deals, columns);
  const filename = generateFilename('deals');
  downloadCSV(csvContent, filename);
}
