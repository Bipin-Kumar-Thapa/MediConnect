import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ResetPassword.css';

const getCSRFToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
};

const ResetPassword = () => {
  const { uid, token } = useParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:8000/accounts/get-csrf/', { withCredentials: true });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        'http://localhost:8000/accounts/reset-password-confirm/',
        { uid, token, password },
        {
          headers: { 'X-CSRFToken': getCSRFToken() },
          withCredentials: true,
        }
      );

      setMessage('Password reset successful');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage('Invalid or expired link');
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-card">
          <h2>Reset Password</h2>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" className="reset-password-btn">
              Reset Password
            </button>
          </form>

          {message && <p className="reset-message">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
