'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const PASSWORD = '54321'
const PROTECTED_ROUTES = ['/sales-history', '/expenses', '/miscellaneous', '/audit', '/a']

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  // Prevent double prompt in development (React Strict Mode)
  const hasPromptedRef = useRef(false)

  useEffect(() => {
    if (hasPromptedRef.current) return

    hasPromptedRef.current = true // Prevent re-running

    if (PROTECTED_ROUTES.includes(pathname)) {
      const input = window.prompt('Enter password to access this page:')
      if (input === PASSWORD) {
        setAuthorized(true)
      } else {
        alert('Incorrect password. Redirecting to home.')
        router.push('/')
      }
    } else {
      setAuthorized(true)
    }
  }, [pathname, router])

  if (!authorized) return null

  return <>{children}</>
}

export default ProtectedRoute
