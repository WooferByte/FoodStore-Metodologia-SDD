/**
 * UserEditModal — modal form for editing a user's nombre, apellido, email, and roles.
 *
 * Design decisions (design.md):
 *   - Client-side validation before calling the mutation
 *   - 409 error shown inline (modal stays open, error below the email field)
 *   - Other errors: toast already shown by axios interceptor
 *   - Local form state reset when modal opens (useEffect on isOpen + user)
 *   - Minimum 1 role must remain selected
 *
 * Accessibility:
 *   - All inputs have associated <label>
 *   - Error messages use role="alert" for screen readers
 *   - Focus returns to trigger button when modal closes (native <dialog>)
 */

import { useState, useEffect } from 'react'
import axios from 'axios'
import { cn } from '@/shared/lib/utils'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { useUpdateUser } from '@/features/users/hooks/useUpdateUser'
import { ROLE_COLORS, ROLES_LIST } from '@/features/users/constants'
import type { AdminUser } from '@/features/users/types'

export interface UserEditModalProps {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
}

/** Validate email with basic regex */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Extract RFC 7807 detail string from an axios error */
function extractDetail(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null
  const data = error.response?.data as { detail?: unknown } | undefined
  if (typeof data?.detail === 'string') return data.detail
  return null
}

export function UserEditModal({ user, isOpen, onClose }: UserEditModalProps) {
  const [nombre,   setNombre]   = useState('')
  const [apellido, setApellido] = useState('')
  const [email,    setEmail]    = useState('')
  const [roles,    setRoles]    = useState<string[]>([])

  // Field-level errors
  const [emailError,  setEmailError]  = useState('')
  const [rolesError,  setRolesError]  = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)

  const mutation = useUpdateUser()

  // Reset local state when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setNombre(user.nombre ?? '')
      setApellido(user.apellido ?? '')
      setEmail(user.email ?? '')
      setRoles([...(user.roles ?? [])])
      setEmailError('')
      setRolesError('')
      setInlineError(null)
    }
  }, [isOpen, user])

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
    setRolesError('')
  }

  function validate(): boolean {
    let valid = true

    if (!email.trim()) {
      setEmailError('El email es obligatorio')
      valid = false
    } else if (!isValidEmail(email)) {
      setEmailError('El formato del email no es válido')
      valid = false
    } else {
      setEmailError('')
    }

    if (roles.length === 0) {
      setRolesError('Debe seleccionar al menos un rol')
      valid = false
    } else {
      setRolesError('')
    }

    return valid
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInlineError(null)

    if (!user) return
    if (!validate()) return

    try {
      await mutation.mutateAsync({
        userId: user.id,
        payload: {
          nombre:   nombre.trim() || undefined,
          apellido: apellido.trim() || undefined,
          email:    email.trim(),
          roles,
        },
      })
      onClose()
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const detail = extractDetail(error)
        setInlineError(detail ?? 'El email ya está registrado por otro usuario')
      }
      // Non-409: interceptor already showed a toast, nothing else to do
    }
  }

  if (!user) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar usuario — ${user.email}`}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Inline 409 error */}
        {inlineError && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {inlineError}
          </p>
        )}

        {/* Nombre */}
        <Input
          id="edit-nombre"
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="given-name"
        />

        {/* Apellido */}
        <Input
          id="edit-apellido"
          label="Apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          autoComplete="family-name"
        />

        {/* Email */}
        <Input
          id="edit-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setEmailError('')
          }}
          error={emailError}
          autoComplete="email"
        />

        {/* Roles */}
        <fieldset>
          <legend className="text-sm font-medium text-foreground mb-2">Roles</legend>
          <div className="flex flex-wrap gap-3">
            {ROLES_LIST.map((role) => {
              const colors = ROLE_COLORS[role]
              const checked = roles.includes(role)
              return (
                <label
                  key={role}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(role)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                    aria-label={`Rol ${role}`}
                  />
                  <span
                    className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', colors?.bg, colors?.text)}
                  >
                    {role}
                  </span>
                </label>
              )
            })}
          </div>
          {rolesError && (
            <p role="alert" className="mt-1 text-sm text-destructive">
              {rolesError}
            </p>
          )}
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={mutation.isPending}
          >
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
