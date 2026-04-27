/**
 * Re-export shim for backward compatibility.
 * Canonical location: @features/items/views/ItemsView/
 * Consumers: App.tsx, viewRenderers.tsx (2 source + 1 test)
 * Story: 15b-1e
 */
export { ItemsView } from '@features/items/views/ItemsView';
export {
    useItemsViewData,
    type UseItemsViewDataReturn,
    type UserInfo,
} from '@features/items/views/ItemsView/useItemsViewData';
