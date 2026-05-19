/**
 * Admin Users feature — constants.
 *
 * ROLE_COLORS uses Tailwind v4 semantic token classes.
 * Tailwind v4 requires complete class strings (not dynamic concatenation)
 * for the compiler to include them in the bundle.
 */

/** Badge color classes per role — bg + text using semantic Tailwind v4 tokens */
export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN:    { bg: 'bg-destructive/15', text: 'text-destructive' },
  STOCK:    { bg: 'bg-primary/15',     text: 'text-primary' },
  PEDIDOS:  { bg: 'bg-orange-500/15',  text: 'text-orange-600' },
  CLIENT:   { bg: 'bg-success/15',     text: 'text-success' },
}

/** Ordered list of all valid roles for checkboxes and filter selects */
export const ROLES_LIST = ['ADMIN', 'STOCK', 'PEDIDOS', 'CLIENT'] as const

export type RoleName = typeof ROLES_LIST[number]

/** Number of users per page — must match the API default */
export const PAGE_SIZE = 20
