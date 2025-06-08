import SignUpPage from "./components/page"
import AuthGuard from "@/components/auth/AuthGuard"

export default function Page() {
  return (
    <AuthGuard requireAuth={false}>
      <SignUpPage />
    </AuthGuard>
  )
}
