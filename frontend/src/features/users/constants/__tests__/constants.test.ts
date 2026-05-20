import { describe, it, expect } from 'vitest'
import { ROLE_COLORS, ROLES_LIST, PAGE_SIZE } from '@/features/users/constants'

describe('users constants', () => {
  describe('ROLE_COLORS', () => {
    it('has exactly 4 role keys', () => {
      expect(Object.keys(ROLE_COLORS)).toHaveLength(4)
    })

    it('has ADMIN key with bg and text classes', () => {
      expect(ROLE_COLORS.ADMIN).toBeDefined()
      expect(ROLE_COLORS.ADMIN.bg).toBeTruthy()
      expect(ROLE_COLORS.ADMIN.text).toBeTruthy()
    })

    it('has STOCK key with bg and text classes', () => {
      expect(ROLE_COLORS.STOCK).toBeDefined()
      expect(ROLE_COLORS.STOCK.bg).toBeTruthy()
      expect(ROLE_COLORS.STOCK.text).toBeTruthy()
    })

    it('has PEDIDOS key with bg and text classes', () => {
      expect(ROLE_COLORS.PEDIDOS).toBeDefined()
      expect(ROLE_COLORS.PEDIDOS.bg).toBeTruthy()
      expect(ROLE_COLORS.PEDIDOS.text).toBeTruthy()
    })

    it('has CLIENT key with bg and text classes', () => {
      expect(ROLE_COLORS.CLIENT).toBeDefined()
      expect(ROLE_COLORS.CLIENT.bg).toBeTruthy()
      expect(ROLE_COLORS.CLIENT.text).toBeTruthy()
    })
  })

  describe('ROLES_LIST', () => {
    it('contains all 4 roles in correct order', () => {
      expect(ROLES_LIST).toEqual(['ADMIN', 'STOCK', 'PEDIDOS', 'CLIENT'])
    })
  })

  describe('PAGE_SIZE', () => {
    it('is 20', () => {
      expect(PAGE_SIZE).toBe(20)
    })
  })
})
