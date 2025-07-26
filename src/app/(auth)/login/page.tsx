import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { FinSightLogo } from '@/components/finsight-logo';

export default function LoginPage() {
  return (
    <div className="flex w-full flex-col items-center space-y-6">
      <FinSightLogo />
      <div className="w-full text-center">
        <h1 className="text-2xl font-bold">Welcome Back</h1>
        <p className="text-muted-foreground">Log in to your FinSight account</p>
      </div>
      <LoginForm />
      <p className="text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
