import { LoginForm } from "@/app/auth/login-form"
import AuthGuard from "@/components/auth/AuthGuard"

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </AuthGuard>
  )
}
