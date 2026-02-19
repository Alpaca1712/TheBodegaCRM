import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from './contact-form';
import * as api from '@/lib/api/contacts';

// Mock the contacts API
vi.mock('@/lib/api/contacts', () => ({
  createContact: vi.fn(),
  updateContact: vi.fn(),
}));

// Mock Next.js navigation
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

describe('ContactForm', () => {
  const mockContact = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    title: 'CEO',
    status: 'active' as const,
    source: 'website',
    notes: 'Test contact',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form for new contact', () => {
    render(<ContactForm />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update contact/i })).not.toBeInTheDocument();
  });

  it('renders populated form for editing existing contact', () => {
    render(<ContactForm contact={mockContact} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue(mockContact.first_name);
    expect(screen.getByLabelText(/last name/i)).toHaveValue(mockContact.last_name);
    expect(screen.getByLabelText(/email/i)).toHaveValue(mockContact.email);
    expect(screen.getByLabelText(/phone/i)).toHaveValue(mockContact.phone);
    expect(screen.getByRole('button', { name: /update contact/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create contact/i })).not.toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    render(<ContactForm />);

    const submitButton = screen.getByRole('button', { name: /create contact/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    expect(api.createContact).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    render(<ContactForm />);

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /create contact/i });

    await userEvent.type(firstNameInput, 'John');
    await userEvent.type(lastNameInput, 'Doe');
    await userEvent.type(emailInput, 'invalid-email');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });

    expect(api.createContact).not.toHaveBeenCalled();
  });

  it('submits valid form for new contact', async () => {
    const mockResponse = { data: { ...mockContact, id: 'new-id' }, error: null };
    (api.createContact as jest.Mock).mockResolvedValue(mockResponse);

    render(<ContactForm />);

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    const submitButton = screen.getByRole('button', { name: /create contact/i });

    await userEvent.type(firstNameInput, mockContact.first_name);
    await userEvent.type(lastNameInput, mockContact.last_name);
    await userEvent.type(emailInput, mockContact.email);
    await userEvent.type(phoneInput, mockContact.phone);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.createContact).toHaveBeenCalledWith({
        first_name: mockContact.first_name,
        last_name: mockContact.last_name,
        email: mockContact.email,
        phone: mockContact.phone,
        status: 'lead', // default status
        source: '', // empty string default
        title: '', // empty string default
        notes: '', // empty string default
      });
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/contacts');
    });
  });

  it('submits valid form for updating contact', async () => {
    const mockResponse = { data: mockContact, error: null };
    (api.updateContact as jest.Mock).mockResolvedValue(mockResponse);

    render(<ContactForm contact={mockContact} />);

    const firstNameInput = screen.getByLabelText(/first name/i);
    const submitButton = screen.getByRole('button', { name: /update contact/i });

    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Jane');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.updateContact).toHaveBeenCalledWith(mockContact.id, {
        first_name: 'Jane',
        last_name: mockContact.last_name,
        email: mockContact.email,
        phone: mockContact.phone,
        title: mockContact.title,
        status: mockContact.status,
        source: mockContact.source,
        notes: mockContact.notes,
      });
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/contacts');
    });
  });

  it('displays error when API call fails', async () => {
    const mockError = new Error('Failed to create contact');
    (api.createContact as jest.Mock).mockRejectedValue(mockError);

    render(<ContactForm />);

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /create contact/i });

    await userEvent.type(firstNameInput, 'John');
    await userEvent.type(lastNameInput, 'Doe');
    await userEvent.type(emailInput, 'john@example.com');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create contact/i)).toBeInTheDocument();
    });
  });
});
