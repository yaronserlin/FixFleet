// __tests__/LoginComponent.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginComponent from '../src/components/LoginComponent';

// Mock LoginCard to isolate LoginComponent
jest.mock('../src/components/LoginComponent/LoginCard', () => () => <div>LoginCardMock</div>);

describe('LoginComponent', () => {
    test('renders LoginCard inside container', () => {
        render(<MemoryRouter><LoginComponent /></MemoryRouter>);
        expect(screen.getByText('LoginCardMock')).toBeInTheDocument();
    });

    test('logo links to the home page', () => {
        render(<MemoryRouter><LoginComponent /></MemoryRouter>);
        expect(screen.getByRole('link', { name: /fixfleet/i })).toHaveAttribute('href', '/');
    });
});
