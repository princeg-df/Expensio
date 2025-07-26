import Link from 'next/link';
import { SignupForm } from '@/components/auth/signup-form';
import { FinSightLogo } from '@/components/finsight-logo';

export default function SignupPage() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center space-y-6">
      <FinSightLogo />
      <div className="w-full text-center">
        <h1 className="text-2xl font-bold">Create an Account</h1>
        <p className="text-muted-foreground">Start your financial journey with FinSight</p>
      </div>
      <SignupForm />
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log In
        </Link>
      </p>
    </div>
  );
}
