import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DealForm } from './deal-form';
import * as api from '@/lib/api/deals';
import * as contactsApi from '@/lib/api/contacts';
import * as companiesApi from '@/lib/api/companies';

// Mock the APIs
vi.mock('@/lib/api/deals', () => ({
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
}));

vi.mock('@/lib/api/contacts', () => ({
  getContacts: vi.fn(),
}));

vi.mock('@/lib/api/companies', () => ({
  getCompanies: vi.fn(),
}));

// Mock Next.js navigation
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

describe('DealForm', () => {
  const mockDeal = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Enterprise Deal',
    stage: 'proposal' as const,
    value: 50000,
    probability: 75,
    expected_close_date: '2024-12-31',
    contact_id: '123e4567-e89b-12d3-a456-426614174000',
    company_id: '123e4567-e89b-12d3-a456-426614174001',
    notes: 'Test deal',
  };

  const mockContacts = {
    data: [
      { id: 'contact-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
      { id: 'contact-2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
    ],
    error: null,
  };

  const mockCompanies = {
    data: [
      { id: 'company-1', name: 'Acme Corp' },
      { id: 'company-2', name: 'Globex' },
    ],
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (contactsApi.getContacts as jest.Mock).mockResolvedValue(mockContacts);
    (companiesApi.getCompanies as jest.Mock).mockResolvedValue(mockCompanies);
  });

  it('renders empty form for new deal', async () => {
    render(<DealForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/deal name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/probability/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expected close date/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create deal/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /update deal/i })).not.toBeInTheDocument();
    });
  });

  it('renders populated form for editing existing deal', async () => {
    render(<DealForm deal={mockDeal} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/deal name/i)).toHaveValue(mockDeal.name);
      expect(screen.getByLabelText(/stage/i)).toHaveValue(mockDeal.stage);
      expect(screen.getByLabelText(/value/i)).toHaveValue(mockDeal.value.toString());
      expect(screen.getByLabelText(/probability/i)).toHaveValue(mockDeal.probability.toString());
      expect(screen.getByRole('button', { name: /update deal/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create deal/i })).not.toBeInTheDocument();
    });
  });

  it('validates required fields on submit', async () => {
    render(<DealForm />);

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /create deal/i });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/deal name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/stage is required/i)).toBeInTheDocument();
      expect(screen.getByText(/value is required/i)).toBeInTheDocument();
    });

    expect(api.createDeal).not.toHaveBeenCalled();
  });

  it('validates value must be positive number', async () => {
    render(<DealForm />);

    const nameInput = screen.getByLabelText(/deal name/i);
    const stageSelect = screen.getByLabelText(/stage/i);
    const valueInput = screen.getByLabelText(/value/i);
    const submitButton = screen.getByRole('button', { name: /create deal/i });

    await userEvent.type(nameInput, 'Test Deal');
    await userEvent.selectOptions(stageSelect, 'lead');
    await userEvent.type(valueInput, '-100');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/value must be positive/i)).toBeInTheDocument();
    });

    expect(api.createDeal).not.toHaveBeenCalled();
  });

  it('validates probability range', async () => {
    render(<DealForm />);

    const nameInput = screen.getByLabelText(/deal name/i);
    const stageSelect = screen.getByLabelText(/stage/i);
    const valueInput = screen.getByLabelText(/value/i);
    const probabilityInput = screen.getByLabelText(/probability/i);
    const submitButton = screen.getByRole('button', { name: /create deal/i });

    await userEvent.type(nameInput, 'Test Deal');
    await userEvent.selectOptions(stageSelect, 'lead');
    await userEvent.type(valueInput, '10000');
    await userEvent.type(probabilityInput, '150');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/probability must be between 0 and 100/i)).toBeInTheDocument();
    });

    expect(api.createDeal).not.toHaveBeenCalled();
  });

  it('submits valid form for new deal', async () => {
    const mockResponse = { data: { ...mockDeal, id: 'new-id' }, error: null };
    (api.createDeal as jest.Mock).mockResolvedValue(mockResponse);

    render(<DealForm />);

    const nameInput = screen.getByLabelText(/deal name/i);
    const stageSelect = screen.getByLabelText(/stage/i);
    const valueInput = screen.getByLabelText(/value/i);
    const probabilityInput = screen.getByLabelText(/probability/i);
    const submitButton = screen.getByRole('button', { name: /create deal/i });

    await userEvent.type(nameInput, mockDeal.name);
    await userEvent.selectOptions(stageSelect, mockDeal.stage);
    await userEvent.type(valueInput, mockDeal.value.toString());
    await userEvent.type(probabilityInput, mockDeal.probability.toString());
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.createDeal).toHaveBeenCalledWith({
        name: mockDeal.name,
        stage: mockDeal.stage,
        value: mockDeal.value,
        probability: mockDeal.probability,
        expected_close_date: expect.any(String),
        status: 'open',
        notes: '',
      });
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/deals');
    });
  });

  it('submits valid form for updating deal', async () => {
    const mockResponse = { data: mockDeal, error: null };
    (api.updateDeal as jest.Mock).mockResolvedValue(mockResponse);

    render(<DealForm deal={mockDeal} />);

    const nameInput = screen.getByLabelText(/deal name/i);
    const submitButton = screen.getByRole('button', { name: /update deal/i });

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Deal Name');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.updateDeal).toHaveBeenCalledWith(mockDeal.id, {
        name: 'Updated Deal Name',
        stage: mockDeal.stage,
        value: mockDeal.value,
        probability: mockDeal.probability,
        expected_close_date: mockDeal.expected_close_date,
        notes: mockDeal.notes,
      });
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/deals');
    });
  });

  it('displays error when API call fails', async () => {
    const mockError = new Error('Failed to create deal');
    (api.createDeal as jest.Mock).mockRejectedValue(mockError);

    render(<DealForm />);

    const nameInput = screen.getByLabelText(/deal name/i);
    const stageSelect = screen.getByLabelText(/stage/i);
    const valueInput = screen.getByLabelText(/value/i);
    const submitButton = screen.getByRole('button', { name: /create deal/i });

    await userEvent.type(nameInput, 'Test Deal');
    await userEvent.selectOptions(stageSelect, 'lead');
    await userEvent.type(valueInput, '10000');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create deal/i)).toBeInTheDocument();
    });
  });
});
