/**
 * orderTransitions tests.
 *
 * Covers:
 *   - FSM_TRANSITIONS: correct targets for each state
 *   - getValidTransitions: returns correct array, defaults to [] for unknown
 *   - isTerminalState: returns true for 5 and 6, false for others
 *   - ORDER_STATUS_LABELS: has labels for all 6 states
 */

import { describe, it, expect } from 'vitest'
import {
  FSM_TRANSITIONS,
  VALID_TRANSITIONS,
  getValidTransitions,
  isTerminalState,
  ORDER_STATUS_LABELS,
  TERMINAL_STATES,
} from '../orderTransitions'

describe('FSM_TRANSITIONS', () => {
  it('PENDIENTE (1) can only be cancelled [6]', () => {
    expect(FSM_TRANSITIONS[1]).toEqual([6])
  })

  it('CONFIRMADO (2) can go to EN_PREPARACIÓN (3) or CANCELADO (6)', () => {
    expect(FSM_TRANSITIONS[2]).toEqual([3, 6])
  })

  it('EN_PREPARACIÓN (3) can only go to EN_CAMINO (4)', () => {
    expect(FSM_TRANSITIONS[3]).toEqual([4])
  })

  it('EN_CAMINO (4) can only go to ENTREGADO (5)', () => {
    expect(FSM_TRANSITIONS[4]).toEqual([5])
  })

  it('ENTREGADO (5) is terminal — empty transitions', () => {
    expect(FSM_TRANSITIONS[5]).toEqual([])
  })

  it('CANCELADO (6) is terminal — empty transitions', () => {
    expect(FSM_TRANSITIONS[6]).toEqual([])
  })
})

describe('VALID_TRANSITIONS (legacy admin-advance only)', () => {
  it('PENDIENTE (1) has no manual advance', () => {
    expect(VALID_TRANSITIONS[1]).toEqual([])
  })

  it('CONFIRMADO (2) can advance to EN_PREPARACIÓN (3)', () => {
    expect(VALID_TRANSITIONS[2]).toEqual([3])
  })
})

describe('getValidTransitions', () => {
  it('returns [6] for PENDIENTE (1)', () => {
    expect(getValidTransitions(1)).toEqual([6])
  })

  it('returns [3, 6] for CONFIRMADO (2)', () => {
    expect(getValidTransitions(2)).toEqual([3, 6])
  })

  it('returns [4] for EN_PREPARACIÓN (3)', () => {
    expect(getValidTransitions(3)).toEqual([4])
  })

  it('returns [] for ENTREGADO (5)', () => {
    expect(getValidTransitions(5)).toEqual([])
  })

  it('returns [] for unknown state (99)', () => {
    expect(getValidTransitions(99)).toEqual([])
  })
})

describe('isTerminalState', () => {
  it('returns true for ENTREGADO (5)', () => {
    expect(isTerminalState(5)).toBe(true)
  })

  it('returns true for CANCELADO (6)', () => {
    expect(isTerminalState(6)).toBe(true)
  })

  it('returns false for PENDIENTE (1)', () => {
    expect(isTerminalState(1)).toBe(false)
  })

  it('returns false for CONFIRMADO (2)', () => {
    expect(isTerminalState(2)).toBe(false)
  })

  it('returns false for EN_PREPARACIÓN (3)', () => {
    expect(isTerminalState(3)).toBe(false)
  })

  it('returns false for EN_CAMINO (4)', () => {
    expect(isTerminalState(4)).toBe(false)
  })

  it('returns false for unknown state (99)', () => {
    expect(isTerminalState(99)).toBe(false)
  })
})

describe('TERMINAL_STATES', () => {
  it('contains exactly 5 and 6', () => {
    expect(TERMINAL_STATES.has(5)).toBe(true)
    expect(TERMINAL_STATES.has(6)).toBe(true)
    expect(TERMINAL_STATES.size).toBe(2)
  })
})

describe('ORDER_STATUS_LABELS', () => {
  it('has labels for all 6 states', () => {
    expect(ORDER_STATUS_LABELS[1]).toBe('Pendiente')
    expect(ORDER_STATUS_LABELS[2]).toBe('Confirmado')
    expect(ORDER_STATUS_LABELS[3]).toBe('En preparación')
    expect(ORDER_STATUS_LABELS[4]).toBe('En camino')
    expect(ORDER_STATUS_LABELS[5]).toBe('Entregado')
    expect(ORDER_STATUS_LABELS[6]).toBe('Cancelado')
  })
})
