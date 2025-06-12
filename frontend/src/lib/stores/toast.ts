import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

export const toasts = writable<Toast[]>([]);

let toastId = 0;

export function addToast(toast: Omit<Toast, 'id'>) {
  const id = `toast-${++toastId}`;
  const newToast: Toast = {
    id,
    dismissible: true,
    duration: 5000,
    ...toast
  };

  toasts.update((all) => [newToast, ...all]);

  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }

  return id;
}

export function removeToast(id: string) {
  toasts.update((all) => all.filter((t) => t.id !== id));
}

export function clearToasts() {
  toasts.set([]);
}

// Convenience functions
export function toast(message: string, type: Toast['type'] = 'info', title?: string) {
  return addToast({
    type,
    title: title || capitalize(type),
    message,
  });
}

export function success(message: string, title?: string) {
  return toast(message, 'success', title);
}

export function error(message: string, title?: string) {
  return toast(message, 'error', title);
}

export function warning(message: string, title?: string) {
  return toast(message, 'warning', title);
}

export function info(message: string, title?: string) {
  return toast(message, 'info', title);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}