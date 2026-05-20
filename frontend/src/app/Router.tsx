import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/routing/ProtectedRoute'
import { Spinner } from '@/shared/components/ui/Spinner'

// Lazy-loaded pages — each becomes a separate chunk (code splitting)
const Catalog           = lazy(() => import('@/pages/Catalog'))
const Login             = lazy(() => import('@/pages/Login'))
const Register          = lazy(() => import('@/pages/Register'))
const NotFound          = lazy(() => import('@/pages/NotFound'))
const ForbiddenPage     = lazy(() => import('@/pages/ForbiddenPage'))
const Profile           = lazy(() => import('@/pages/Profile'))
const Admin             = lazy(() => import('@/pages/Admin'))
const MyAddressesPage   = lazy(() => import('@/pages/MyAddressesPage'))
const CartPage          = lazy(() => import('@/pages/CartPage'))
const CheckoutPage      = lazy(() => import('@/pages/CheckoutPage'))
// Orders listing pages (change: frontend-orders-listing-ui)
const MyOrdersPage      = lazy(() => import('@/pages/MyOrdersPage'))
const OrdersPanelPage   = lazy(() => import('@/pages/OrdersPanelPage'))
// Order detail page (change: frontend-orders-detail-ui)
const OrderDetailPage   = lazy(() => import('@/pages/OrderDetailPage'))
// Admin users management page (change: admin-users-management-ui)
const UsersPage         = lazy(() => import('@/pages/UsersPage'))
// Admin categories management page (change: admin-categories-management-ui)
const CategoriesPage    = lazy(() => import('@/pages/CategoriesPage'))
// Admin products management page (change: admin-products-management-ui)
const AdminProductsPage = lazy(() => import('@/pages/AdminProductsPage'))

/**
 * Router — defines all application routes.
 *
 * Route access control:
 *   Public:  /  /catalog  /login  /register
 *   CLIENT:  /cart  /orders  /profile  /addresses  (CLIENT or ADMIN)
 *   STOCK:   /admin/productos  /admin/categorias  /admin/ingredientes  (STOCK or ADMIN)
 *   PEDIDOS: /admin/pedidos  (PEDIDOS or ADMIN)
 *   ADMIN:   /admin/usuarios  /admin/metricas  /admin/configuracion  (ADMIN only)
 */
export default function Router() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* ── Public routes ─────────────────────────────────── */}
        <Route path="/" element={<Catalog />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Error pages ───────────────────────────────────── */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFound />} />

        {/* ── CLIENT routes: require CLIENT or ADMIN ────────── */}
        <Route element={<ProtectedRoute requiredRoles={['CLIENT', 'ADMIN']} />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<MyOrdersPage />} />
          <Route path="/pedidos/:id" element={<OrderDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/addresses" element={<MyAddressesPage />} />
        </Route>

        {/* ── STOCK routes: require STOCK or ADMIN ──────────── */}
        <Route element={<ProtectedRoute requiredRoles={['STOCK', 'ADMIN']} />}>
          <Route path="/admin/productos" element={<AdminProductsPage />} />
          <Route path="/admin/categorias" element={<CategoriesPage />} />
          <Route path="/admin/ingredientes" element={<Admin />} />
        </Route>

        {/* ── PEDIDOS routes: require PEDIDOS or ADMIN ──────── */}
        <Route element={<ProtectedRoute requiredRoles={['PEDIDOS', 'ADMIN']} />}>
          <Route path="/admin/pedidos" element={<OrdersPanelPage />} />
          <Route
            path="/admin/pedidos/:id"
            element={<OrderDetailPage adminMode />}
          />
        </Route>

        {/* ── ADMIN-only routes ─────────────────────────────── */}
        <Route element={<ProtectedRoute requiredRoles={['ADMIN']} />}>
          <Route path="/admin/usuarios" element={<UsersPage />} />
          <Route path="/admin/metricas" element={<Admin />} />
          <Route path="/admin/configuracion" element={
            <div className="p-6 space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
              <p className="text-muted-foreground">Próximamente disponible.</p>
            </div>
          } />
          {/* General admin dashboard */}
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* ── Catch-all ─────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  )
}
