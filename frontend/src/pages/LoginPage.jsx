// frontend/src/pages/LoginPage.jsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-sm [animation:fade-in-up_0.4s_ease_both] p-10 shadow-[var(--shadow-lg)]"
      >
        <Link to="/" className="mb-4 inline-flex">
          <img src="/icon-64.png" alt="Smart Bill Split" className="h-11 w-11 rounded-xl" />
        </Link>
        <h1 className="mb-1 !text-3xl">Log in</h1>
        <p className="mb-6 text-sm text-text">Welcome back to Smart Bill Split.</p>
        <ErrorBanner message={error} />

        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary mt-2" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
          <p className="text-center text-sm text-text">
            No account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
