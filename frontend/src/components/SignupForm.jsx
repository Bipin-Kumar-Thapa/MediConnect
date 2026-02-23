import React, { useState } from 'react';
import axios from 'axios';
import '../styles/SignupForm.css';  
import { Link, useNavigate } from 'react-router-dom';

const SignupForm = () => {
  const [role, setRole] = useState('patient');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationCode, setValidationCode] = useState('');
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const csrfToken = getCSRFToken();

      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role,
      };

      if (role !== 'patient') {
        payload.validation_code = validationCode;
      }

      await axios.post(
        'http://localhost:8000/accounts/signup/',
        payload,
        {
          headers: {
            'X-CSRFToken': csrfToken,
          },
          withCredentials: true,
        }
      );

      navigate('/login');
    } catch (error) {
      setError(error.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-card">

          {/* Header */}
          <div className="signup-header">
            <h2>Sign Up</h2>
            <p>Please fill in this form to create an account!</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="signup-form">

            <div className="input-group-row">
              <div className="input-group">
                <label>First Name</label>
                <input
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

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

            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Select Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="staff">Staff</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </div>

            {role !== 'patient' && (
              <div className="input-group">
                <label>Validation Code</label>
                <input
                  type="text"
                  placeholder="Enter validation code"
                  value={validationCode}
                  onChange={(e) => setValidationCode(e.target.value)}
                  required
                />
              </div>
            )}

            {error && <div className="error-text">{error}</div>}

            <button type="submit" className="signup-btn">
              Sign Up
            </button>
          </form>

          <p className="login-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default SignupForm;
