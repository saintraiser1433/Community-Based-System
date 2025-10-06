import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        if (req.nextUrl.pathname.startsWith('/auth/') || 
            req.nextUrl.pathname === '/' ||
            req.nextUrl.pathname.startsWith('/api/auth/')) {
          return true
        }

        // Require authentication for protected routes
        if (req.nextUrl.pathname.startsWith('/resident/') ||
            req.nextUrl.pathname.startsWith('/barangay/') ||
            req.nextUrl.pathname.startsWith('/admin/')) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/resident/:path*',
    '/barangay/:path*',
    '/admin/:path*',
    '/api/resident/:path*',
    '/api/barangay/:path*',
    '/api/admin/:path*'
  ]
}
