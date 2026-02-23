import React, { useState } from 'react';
import axios from 'axios';
import '../styles/LoginForm.css';
import { Link, useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const getCSRFToken = () => {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    return csrfToken;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const csrfToken = getCSRFToken();

      const response = await axios.post(
        'http://localhost:8000/accounts/login/',
        { email, password },
        {
          headers: {
            'X-CSRFToken': csrfToken,
          },
          withCredentials: true,
        }
      );

      const role = response.data.role;

      if (role === 'patient') {
        navigate('/patient');
      } else if (role === 'doctor') {
        navigate('/doctor');
      } else if (role === 'staff') {
        navigate('/staff');
      } else if (role === 'pharmacy') {
        navigate('/pharmacy');
      } else {
        setError('User role not recognized');
      }

    } catch (error) {
      setError(error.response?.data?.message || 'Invalid email or password');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">

          {/* Header */}
          <div className="login-header">
            <div className="login-logo">
              <img src="/images/Logo.png" alt="Logo" />
            </div>
            <h2>Welcome back</h2>
            <p>Please enter your details to sign in</p>
          </div>

          {/* Social Login */}
          <div className="social-buttons">
            <a
              href="http://localhost:8000/accounts/google/login"
              className="social-btn"
            >
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google logo"
                style={{ width: '40px', height: '40px' }}
              />
            </a>
          </div>

          {/* Divider */}
          <div className="divider">
            <span>OR</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="forgot-password">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            {error && <div className="error-text">{error}</div>}

            <button type="submit" className="login-btn">
              Sign in
            </button>
          </form>

          {/* Footer */}
          <p className="signup-text">
            Don’t have an account? <Link to="/signup">Sign up</Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default LoginForm;
