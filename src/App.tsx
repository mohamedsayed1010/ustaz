import { RouterProvider } from 'react-router-dom'
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/routes'
import { queryClient } from '@/lib/query-client'
import { I18nProvider } from '@/i18n'
import { ThemeProvider } from '@/hooks/use-theme'
import { ToastProvider } from '@/hooks/use-toast'
import { AuthProvider } from '@/hooks/use-auth'
import { TooltipProvider } from '@/components/ui/primitives'
import { Toaster } from '@/components/ui/toaster'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <TooltipProvider delayDuration={220} skipDelayDuration={400}>
                <LazyMotion features={domAnimation} strict={false}>
                  {/* With reduced motion on, every reveal keeps its fade but drops its movement. */}
                  <MotionConfig reducedMotion="user">
                    <RouterProvider router={router} future={{ v7_startTransition: true }} />
                    <Toaster />
                  </MotionConfig>
                </LazyMotion>
              </TooltipProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}
