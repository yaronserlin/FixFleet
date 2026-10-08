// src/components/Tool/ToolsPanel/ToolsPanel.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ToolsPanel from './ToolsPanel';

const renderPanel = () => render(
    <MemoryRouter initialEntries={['/admin']}>
        <Routes>
            <Route path="/admin" element={<ToolsPanel tools={[{ _id: 't1', name: 'Forklift' }]} />} />
            <Route path="/equipment/:id" element={<div>equipment page</div>} />
        </Routes>
    </MemoryRouter>
);

// Both the phone cards and the table rows render in jsdom (CSS hides one).
describe('ToolsPanel rows', () => {
    it('open the equipment page', () => {
        renderPanel();
        fireEvent.click(screen.getAllByRole('button', { name: 'Open Forklift' })[0]);
        expect(screen.getByText('equipment page')).toBeInTheDocument();
    });

    it('do not navigate when an action button is used', () => {
        renderPanel();
        screen.getAllByRole('button', { name: 'Edit Forklift' }).forEach(b => fireEvent.click(b));
        expect(screen.queryByText('equipment page')).not.toBeInTheDocument();
    });
});
