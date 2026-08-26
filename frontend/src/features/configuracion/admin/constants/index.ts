export const CONFIGURACION_QUERY_KEY = 'admin-configuraciones'

// Trailing slash: backend route is GET /api/v1/admin/configuracion/ —
// without it FastAPI answers 307 (fix-refresh-loop-cartdrawer D-2)
export const CONFIGURACION_API_PATH = '/api/v1/admin/configuracion/'

export const CONFIG_STALE_TIME = 5 * 60 * 1000 // 5 minutes
