// src/contexts/ToolContext.test.jsx
import ToolContextDefault, { ToolProvider, useTool, EquipmentProvider, useEquipment } from './ToolContext';
import EquipmentContextDefault from './EquipmentContext';

// ToolContext.jsx is a pure backward-compatibility re-export shim over
// EquipmentContext. These tests just pin down that the re-exports really
// are the same references (behavior itself is covered by EquipmentContext.test.jsx).
describe('ToolContext (backward-compatible re-export of EquipmentContext)', () => {
    it('re-exports ToolProvider as EquipmentProvider', () => {
        expect(ToolProvider).toBe(EquipmentProvider);
    });

    it('re-exports useTool as useEquipment', () => {
        expect(useTool).toBe(useEquipment);
    });

    it('default-exports the same context object as EquipmentContext', () => {
        expect(ToolContextDefault).toBe(EquipmentContextDefault);
    });
});
