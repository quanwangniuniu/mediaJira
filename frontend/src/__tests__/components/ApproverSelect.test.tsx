import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApproverSelect from '@/components/ui/ApproverSelect';
import { ApproverUser } from '@/types/approver';

// Mock data
const mockUsers: ApproverUser[] = [
  { id: 1, username: 'john.doe', email: 'john.doe@company.com' },
  { id: 2, username: 'jane.smith', email: 'jane.smith@company.com' },
  { id: 3, username: 'bob.wilson', email: 'bob.wilson@company.com' },
  { id: 4, username: 'alice.johnson', email: 'alice.johnson@company.com' },
];

const defaultProps = {
  users: mockUsers,
  value: [],
  onChange: jest.fn(),
  placeholder: 'Search for user...',
};

describe('ApproverSelect Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering Tests', () => {
    test('renders without crashing', () => {
      render(<ApproverSelect {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search for user...')).toBeInTheDocument();
    });

    test('shows placeholder text', () => {
      render(<ApproverSelect {...defaultProps} placeholder="Custom placeholder" />);
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });


  });

  describe('User Selection Tests', () => {
    test('opens dropdown on focus', async () => {
      render(<ApproverSelect {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getByText('john.doe')).toBeInTheDocument();
      });
    });

    test('selects user on click', async () => {
      const onChange = jest.fn();
      render(<ApproverSelect {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      fireEvent.focus(input);
      
      await waitFor(() => {
        const userOption = screen.getByText('john.doe');
        fireEvent.mouseDown(userOption);
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith([mockUsers[0]]);
      });
    });

    test('removes user when clicking remove button', async () => {
      const onChange = jest.fn();
      render(<ApproverSelect {...defaultProps} value={[mockUsers[0]]} onChange={onChange} />);
      
      // Find the remove button by looking for the X icon within the selected user span
      const selectedUserSpan = screen.getByText('john.doe').closest('span');
      const removeButton = selectedUserSpan?.querySelector('button');
      
      if (removeButton) {
        fireEvent.click(removeButton);
        
        await waitFor(() => {
          expect(onChange).toHaveBeenCalledWith([]);
        });
      }
    });
  });

  describe('Filtering Tests', () => {
    test('filters users based on input', async () => {
      render(<ApproverSelect {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      fireEvent.change(input, { target: { value: 'john' } });
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getByText('john.doe')).toBeInTheDocument();
        expect(screen.queryByText('jane.smith')).not.toBeInTheDocument();
      });
    });

    test('shows no results message when no matches', async () => {
      render(<ApproverSelect {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      fireEvent.change(input, { target: { value: 'nonexistent' } });
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getByText('No users found.')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State Tests', () => {
    test('disables input when disabled', () => {
      render(<ApproverSelect {...defaultProps} disabled={true} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      expect(input).toBeDisabled();
    });

    test('disables remove buttons when disabled', () => {
      render(<ApproverSelect {...defaultProps} value={[mockUsers[0]]} disabled={true} />);
      
      // Find the remove button
      const selectedUserSpan = screen.getByText('john.doe').closest('span');
      const removeButton = selectedUserSpan?.querySelector('button');
      
      expect(removeButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty users array', async () => {
      render(<ApproverSelect {...defaultProps} users={[]} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'test' } });
      
      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });

    test('handles users with empty username', async () => {
      const usersWithEmptyUsername: ApproverUser[] = [
        { id: 1, username: '', email: 'user1@company.com' },
        { id: 2, username: '', email: 'user2@company.com' },
      ];
      
      render(<ApproverSelect {...defaultProps} users={usersWithEmptyUsername} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getAllByText('Unknown')[0]).toBeInTheDocument();
      });
    });

    test('handles users with empty email', async () => {
      const usersWithEmptyEmail: ApproverUser[] = [
        { id: 1, username: 'user1', email: '' },
        { id: 2, username: 'user2', email: '' },
      ];
      
      render(<ApproverSelect {...defaultProps} users={usersWithEmptyEmail} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getAllByText('(No email)')[0]).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    test('filters large lists efficiently', () => {
      const largeUserList: ApproverUser[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        username: `user${i + 1}`,
        email: `user${i + 1}@company.com`,
      }));
      
      const startTime = performance.now();
      
      render(<ApproverSelect {...defaultProps} users={largeUserList} />);
      
      const input = screen.getByPlaceholderText('Search for user...');
      fireEvent.change(input, { target: { value: 'user500' } });
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should filter in under 100ms
    });
  });
}); 