import { useAuthStore } from '@/store'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasRole = useAuthStore((s) => s.hasRole)
  const logout = useAuthStore((s) => s.logout)

  return { user, isAuthenticated, hasRole, logout }
}
