import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Registration is currently locked by Administrator.
 * Any direct navigation to /register will notify and redirect to /login.
 */
export const Register: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    toast.error('Pendaftaran akun baru saat ini sedang ditutup oleh Administrator.');
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
};

export default Register;
