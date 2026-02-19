import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export const showToast = (
  type: ToastType,
  message: string,
  options: ToastOptions = {}
) => {
  const { title, description, duration = 3000 } = options;
  
  switch (type) {
    case 'success':
      toast.success(title || 'Success!', {
        description: description || message,
        duration,
      });
      break;
    case 'error':
      toast.error(title || 'Error!', {
        description: description || message,
        duration,
      });
      break;
    case 'info':
      toast.info(title || 'Info', {
        description: description || message,
        duration,
      });
      break;
    case 'warning':
      toast.warning(title || 'Warning', {
        description: description || message,
        duration,
      });
      break;
  }
};

// Convenience functions

export const showSuccess = (message: string, options?: ToastOptions) => {
  showToast('success', message, options);
};

export const showError = (message: string, options?: ToastOptions) => {
  showToast('error', message, options);
};

export const showInfo = (message: string, options?: ToastOptions) => {
  showToast('info', message, options);
};

export const showWarning = (message: string, options?: ToastOptions) => {
  showToast('warning', message, options);
};

// CRUD-specific toasts
export const showCreateSuccess = (entity: string) => {
  showSuccess(`${entity} created successfully!`);
};

export const showUpdateSuccess = (entity: string) => {
  showSuccess(`${entity} updated successfully!`);
};

export const showDeleteSuccess = (entity: string) => {
  showSuccess(`${entity} deleted successfully!`);
};

export const showCreateError = (entity: string) => {
  showError(`Failed to create ${entity.toLowerCase()}. Please try again.`);
};

export const showUpdateError = (entity: string) => {
  showError(`Failed to update ${entity.toLowerCase()}. Please try again.`);
};

export const showDeleteError = (entity: string) => {
  showError(`Failed to delete ${entity.toLowerCase()}. Please try again.`);
};

export const showLoadError = (entity: string) => {
  showError(`Failed to load ${entity.toLowerCase()}. Please refresh the page.`);
};
