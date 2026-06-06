'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const supabase = createClient();
		supabase.auth.getClaims().then(({ data }) => {
			if (data?.claims) window.location.href = '/dashboard';
		});
	}, []);

	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex justify-center gap-2 md:justify-start">
					<a href="/dashboard" className="flex items-center gap-2 font-medium">
						{mounted ? (
							<img
								src={resolvedTheme === 'dark' ? '/logo_dark.svg' : '/logo.svg'}
								alt="Efficiency"
								className="h-6 w-32"
							/>
						) : (
							<span className="text-lg font-bold">Efficiency</span>
						)}
					</a>
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<LoginForm />
					</div>
				</div>
			</div>
			<div className="bg-muted relative hidden lg:block">
				<img
					src="/login-illustration.svg"
					alt="Efficiency ERP management platform"
					className="absolute inset-0 h-full w-full object-cover"
				/>
			</div>
		</div>
	);
}

function LoginForm() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const supabase = createClient();
			const { error: authError } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (authError) {
				setError(authError.message);
			} else {
				window.location.href = '/dashboard';
			}
		} catch {
			setError('An unexpected error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6">
			<div className="flex flex-col gap-2 text-center">
				<h1 className="text-2xl font-bold">Login</h1>
				<p className="text-balance text-muted-foreground">
					Enter your email below to login to your account
				</p>
			</div>
			{error && (
				<div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
					{error}
				</div>
			)}
			<div className="flex flex-col gap-6">
				<div className="grid gap-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="m@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>
				<div className="grid gap-2">
					<div className="flex items-center">
						<Label htmlFor="password">Password</Label>
						<a
							href="#"
							className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
						>
							Forgot your password?
						</a>
					</div>
					<Input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<Button type="submit" className="w-full" disabled={loading}>
					{loading ? 'Logging in...' : 'Login'}
				</Button>
			</div>
		</form>
	);
}
