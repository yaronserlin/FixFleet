// src/contexts/EquipmentContext.jsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import equipmentService from '../services/equipmentService';
import { useNotify } from './NotificationContext';
import { useAuth } from './AuthContext';
import { retry, sortToolsByLocalSerial } from '../utils';

const EquipmentContext = createContext();

export function EquipmentProvider({ children }) {
    const notify = useNotify();
    const { user } = useAuth();
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEquipment = useCallback(async () => {
        if (!user || user.mustChangePassword) return;
        setLoading(true);
        setError(null);
        try {
            const data = await retry(() => equipmentService.getAll());
            setEquipment(Array.isArray(data) ? data : (data.tools || []));
        } catch (err) {
            setError(err);
            notify.error('Failed to load equipment');
        } finally {
            setLoading(false);
        }
    }, [user, notify]);

    const createEquipment = useCallback(async (itemData) => {
        try {
            const newItem = await retry(() => equipmentService.create(itemData));
            setEquipment(prev => [newItem, ...prev]);
            notify.success('Equipment created successfully');
            return newItem;
        } catch (err) {
            setError(err);
            notify.error('Failed to create equipment');
            throw err;
        }
    }, [notify]);

    const updateEquipment = useCallback(async (id, updates) => {
        try {
            const updated = await retry(() => equipmentService.update(id, updates));
            setEquipment(prev => prev.map(t => (t._id === id ? updated : t)));
            notify.success('Equipment updated successfully');
            return updated;
        } catch (err) {
            setError(err);
            notify.error('Failed to update equipment');
            throw err;
        }
    }, [notify]);

    const deleteEquipment = useCallback(async (id) => {
        try {
            await retry(() => equipmentService.delete(id));
            setEquipment(prev => prev.filter(t => t._id !== id));
            notify.success('Equipment deleted');
        } catch (err) {
            setError(err);
            notify.error('Failed to delete equipment');
            throw err;
        }
    }, [notify]);

    useEffect(() => {
        if (user && !user.mustChangePassword) {
            fetchEquipment();
        } else {
            setEquipment([]);
            setError(null);
            setLoading(false);
        }
    }, [user, fetchEquipment]);

    const value = useMemo(() => ({
        equipment,
        tools: equipment,
        loading,
        error,
        fetchEquipment,
        fetchTools: fetchEquipment,
        createEquipment,
        createTool: createEquipment,
        updateEquipment,
        updateTool: updateEquipment,
        deleteEquipment,
        deleteTool: deleteEquipment,
    }), [equipment, loading, error, fetchEquipment, createEquipment, updateEquipment, deleteEquipment]);

    return (
        <EquipmentContext.Provider value={value}>
            {children}
        </EquipmentContext.Provider>
    );
}

export function useEquipment() {
    const context = useContext(EquipmentContext);
    if (!context) {
        throw new Error('useEquipment must be used within an EquipmentProvider');
    }

    const { equipment, ...rest } = context;
    const sorted = useMemo(() => sortToolsByLocalSerial(equipment || []), [equipment]);

    // `rest` still carries the provider's raw (unsorted) `tools` alias, so it
    // must be spread BEFORE the sorted overrides below — otherwise it would
    // clobber `tools` back to the unsorted array while `equipment` stayed
    // sorted, silently desyncing the two aliases for any consumer (e.g.
    // FaultForms, AdminDashboard) that reads `tools` instead of `equipment`.
    return { ...rest, equipment: sorted, tools: sorted };
}

// Backward-compatible export
export const ToolProvider = EquipmentProvider;
export const useTool = useEquipment;

export default EquipmentContext;
