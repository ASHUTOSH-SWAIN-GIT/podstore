import AuthHeader from './AuthHeader'
import AuthTitle from './AuthTitle'
import GoogleSignInButton from './GoogleSignInButton'

export default function AuthFormSection() {
  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
      <div className="mx-auto w-full max-w-sm lg:w-96">
        <AuthHeader />
        <AuthTitle />
        <div className="mt-8">
          <div className="mt-8">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    </div>
  )
} 