import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getCSRFToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const csrfToken = getCSRFToken();
      const formData = new FormData();
      formData.append('email', email);

      await axios.post(
        'http://localhost:8000/accounts/password-reset/',
        formData,
        {
          headers: { 'X-CSRFToken': csrfToken },
          withCredentials: true,
        }
      );

      setMessage('Password reset link sent to your email.');
    } catch (err) {
      setError('Something went wrong. Try again.');
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <h2>Forgot Password</h2>
          <p>Enter your registered email</p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="forgot-password-btn">
              Send Reset Link
            </button>
          </form>

          {message && <p className="success-msg">{message}</p>}
          {error && <p className="error-msg">{error}</p>}

          <p className="signup-text">
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
