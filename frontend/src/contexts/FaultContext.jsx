// src/contexts/FaultContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import faultService from '../services/faultsService';
import { useNotify } from './NotificationContext';
import { useAuth } from './AuthContext';
import { canUseTenantApi } from '../constants/roles';
import { retry, sortFaultsByOpenAndCreateDate } from '../utils';

const FaultContext = createContext();

export function FaultProvider({ children }) {
    const notify = useNotify();
    const { user } = useAuth();
    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchFaults = useCallback(async () => {
        if (!user || user.mustChangePassword) return;
        setLoading(true);
        setError(null);
        try {
            const data = await retry(() => faultService.getAll());
            setFaults(data);
        } catch (err) {
            setError(err);
            notify.error('Failed to load faults');
        } finally {
            setLoading(false);
        }
    }, [user, notify]);

    useEffect(() => {
        if (canUseTenantApi(user)) {
            fetchFaults();
        } else {
            setFaults([]);
            setError(null);
            setLoading(false);
        }
    }, [user, fetchFaults]);

    const createFault = useCallback(async (faultData) => {
        try {
            const newFault = await retry(() => faultService.create(faultData));
            setFaults(prev => [newFault, ...prev]);
            notify.success('Fault created successfully');
            return newFault;
        } catch (err) {
            setError(err);
            notify.error('Failed to create fault');
            throw err;
        }
    }, [notify]);

    const updateFault = useCallback(async (id, updates) => {
        try {
            const updated = await retry(() => faultService.update(id, updates));
            setFaults(prev => prev.map(f => f._id === id ? updated : f));
            notify.success('Fault updated successfully');
            return updated;
        } catch (err) {
            setError(err);
            notify.error('Failed to update fault');
            throw err;
        }
    }, [notify]);

    const deleteFault = useCallback(async (id) => {
        try {
            await retry(() => faultService.delete(id));
            setFaults(prev => prev.filter(f => f._id !== id));
            notify.success('Fault deleted');
        } catch (err) {
            setError(err);
            notify.error('Failed to delete fault');
            throw err;
        }
    }, [notify]);

    const closeFault = useCallback(async (id, data = {}) => {
        try {
            const updated = await retry(() => faultService.close(id, data));
            setFaults(prev => prev.map(f => f._id === id ? updated : f));
            notify.success('Fault closed successfully');
            return updated;
        } catch (err) {
            setError(err);
            notify.error('Failed to close fault');
            throw err;
        }
    }, [notify]);

    const reopenFault = useCallback(async (id) => {
        try {
            const updated = await retry(() => faultService.reopen(id));
            setFaults(prev => prev.map(f => f._id === id ? updated : f));
            notify.success('Fault reopened');
            return updated;
        } catch (err) {
            setError(err);
            notify.error('Failed to reopen fault');
            throw err;
        }
    }, [notify]);

    const value = useMemo(() => ({
        faults,
        loading,
        error,
        fetchFaults,
        createFault,
        updateFault,
        deleteFault,
        closeFault,
        reopenFault,
    }), [faults, loading, error, fetchFaults, createFault, updateFault, deleteFault, closeFault, reopenFault]);

    return <FaultContext.Provider value={value}>{children}</FaultContext.Provider>;
}

export function useFault(toolId) {
    const context = useContext(FaultContext);
    if (!context) throw new Error('useFault must be used within FaultProvider');
    const { faults, ...rest } = context;

    const filteredFaults = useMemo(() => {
        if (!faults || faults.length === 0) return [];
        const filtered = toolId
            ? faults.filter(f => {
                const t = f.tool;
                if (!t) return false;
                return (typeof t === 'string' ? t : t._id) === toolId;
            })
            : faults;
        return sortFaultsByOpenAndCreateDate(filtered);
    }, [faults, toolId]);

    return { faults: filteredFaults, ...rest };
}

export default FaultContext;