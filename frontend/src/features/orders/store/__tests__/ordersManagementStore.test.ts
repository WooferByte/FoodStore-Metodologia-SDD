/**
 * ordersManagementStore tests.
 *
 * Verifies:
 *   - Initial state: selectedIds empty Set, isBulkPending false
 *   - toggleId: adds/removes IDs correctly
 *   - setAllIds: replaces selectedIds with new Set
 *   - clearAll: empties selectedIds
 *   - isAllSelected: correctly derives "all checked" state
 *   - isIndeterminate: correctly derives "some but not all" state
 *   - setIsBulkPending: sets flag
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useOrdersManagementStore } from '../ordersManagementStore'

describe('useOrdersManagementStore', () => {
  beforeEach(() => {
    useOrdersManagementStore.setState({
      selectedIds: new Set<number>(),
      isBulkPending: false,
    })
  })

  it('has empty selectedIds and isBulkPending=false as initial state', () => {
    const { selectedIds, isBulkPending } = useOrdersManagementStore.getState()
    expect(selectedIds.size).toBe(0)
    expect(isBulkPending).toBe(false)
  })

  it('toggleId adds an ID when not selected', () => {
    useOrdersManagementStore.getState().toggleId(42)
    expect(useOrdersManagementStore.getState().selectedIds.has(42)).toBe(true)
  })

  it('toggleId removes an ID when already selected', () => {
    useOrdersManagementStore.setState({ selectedIds: new Set([42]) })
    useOrdersManagementStore.getState().toggleId(42)
    expect(useOrdersManagementStore.getState().selectedIds.has(42)).toBe(false)
  })

  it('toggleId does not affect other selected IDs', () => {
    useOrdersManagementStore.setState({ selectedIds: new Set([1, 2, 3]) })
    useOrdersManagementStore.getState().toggleId(2)
    const { selectedIds } = useOrdersManagementStore.getState()
    expect(selectedIds.has(1)).toBe(true)
    expect(selectedIds.has(2)).toBe(false)
    expect(selectedIds.has(3)).toBe(true)
  })

  it('setAllIds replaces selectedIds with all given IDs', () => {
    useOrdersManagementStore.getState().setAllIds([10, 20, 30])
    const { selectedIds } = useOrdersManagementStore.getState()
    expect(selectedIds.size).toBe(3)
    expect(selectedIds.has(10)).toBe(true)
    expect(selectedIds.has(20)).toBe(true)
    expect(selectedIds.has(30)).toBe(true)
  })

  it('clearAll empties selectedIds', () => {
    useOrdersManagementStore.setState({ selectedIds: new Set([1, 2, 3]) })
    useOrdersManagementStore.getState().clearAll()
    expect(useOrdersManagementStore.getState().selectedIds.size).toBe(0)
  })

  it('setIsBulkPending sets the flag', () => {
    useOrdersManagementStore.getState().setIsBulkPending(true)
    expect(useOrdersManagementStore.getState().isBulkPending).toBe(true)
    useOrdersManagementStore.getState().setIsBulkPending(false)
    expect(useOrdersManagementStore.getState().isBulkPending).toBe(false)
  })

  describe('isAllSelected', () => {
    it('returns false for empty ids array', () => {
      expect(useOrdersManagementStore.getState().isAllSelected([])).toBe(false)
    })

    it('returns false when nothing is selected', () => {
      expect(useOrdersManagementStore.getState().isAllSelected([1, 2, 3])).toBe(false)
    })

    it('returns false when only some are selected', () => {
      useOrdersManagementStore.setState({ selectedIds: new Set([1, 2]) })
      expect(useOrdersManagementStore.getState().isAllSelected([1, 2, 3])).toBe(false)
    })

    it('returns true when all ids are selected', () => {
      useOrdersManagementStore.setState({ selectedIds: new Set([1, 2, 3]) })
      expect(useOrdersManagementStore.getState().isAllSelected([1, 2, 3])).toBe(true)
    })
  })

  describe('isIndeterminate', () => {
    it('returns false for empty ids array', () => {
      expect(useOrdersManagementStore.getState().isIndeterminate([])).toBe(false)
    })

    it('returns false when nothing is selected', () => {
      expect(useOrdersManagementStore.getState().isIndeterminate([1, 2, 3])).toBe(false)
    })

    it('returns true when some but not all are selected', () => {
      useOrdersManagementStore.setState({ selectedIds: new Set([1]) })
      expect(useOrdersManagementStore.getState().isIndeterminate([1, 2, 3])).toBe(true)
    })

    it('returns false when all are selected', () => {
      useOrdersManagementStore.setState({ selectedIds: new Set([1, 2, 3]) })
      expect(useOrdersManagementStore.getState().isIndeterminate([1, 2, 3])).toBe(false)
    })
  })
})
