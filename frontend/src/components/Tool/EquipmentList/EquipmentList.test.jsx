// src/components/Tool/EquipmentList/EquipmentList.test.jsx
//
// EquipmentList.jsx is a pure re-export of ToolsList (see ToolsList.test.jsx
// for the component's actual rendering behavior).
import EquipmentList from './EquipmentList';
import ToolsList from '../ToolsList/ToolsList';

describe('EquipmentList (re-export of ToolsList)', () => {
    it('is the same component as ToolsList', () => {
        expect(EquipmentList).toBe(ToolsList);
    });
});
