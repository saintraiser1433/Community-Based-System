import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      barangayId?: string
      barangay?: any
      families?: any[]
    }
  }

  interface User {
    role: string
    barangayId?: string
    barangay?: any
    families?: any[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    barangayId?: string
    barangay?: any
    families?: any[]
  }
}
