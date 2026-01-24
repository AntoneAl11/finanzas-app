import React, { useState, useEffect } from 'react';
import './Login.css';

// Detectar automáticamente el hostname (localhost o IP)
const hostname = window.location.hostname;
const API_URL = `http://${hostname}:8000`;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function Login({ onLoginSuccess }) {
  const [isRegistro, setIsRegistro] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    telefono: '',
    codigoPais: '+52',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistro) {
        // Validar contraseñas coincidan
        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }

        // Registro
        const response = await fetch(`${API_URL}/registro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            nombre: formData.nombre,
            telefono: formData.codigoPais + formData.telefono,
            password: formData.password
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Error en el registro');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        onLoginSuccess(data.access_token);
      } else {
        // Login
        const response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Error al iniciar sesión');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        onLoginSuccess(data.access_token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar la librería de Google Sign-In
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false
        });
        
        // Renderizar el botón de Google
        const buttonDiv = document.getElementById('googleSignInButton');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(
            buttonDiv,
            { 
              theme: 'outline', 
              size: 'large',
              width: 350,
              text: 'continue_with',
              locale: 'es'
            }
          );
        }
      }
    };

    return () => {
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleCallback = async (response) => {
    try {
      setLoading(true);
      setError('');

      // Enviar el token a nuestro backend
      const res = await fetch(`${API_URL}/auth/google/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        onLoginSuccess(data.access_token);
      } else {
        setError(data.detail || 'Error al iniciar sesión con Google');
      }
    } catch (err) {
      setError('Error de conexión con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    console.log('Intentando login con Google...');
    console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
    console.log('window.google:', window.google);
    
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID no está configurado');
      return;
    }
    
    if (window.google && window.google.accounts) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Prompt no se mostró:', notification.getNotDisplayedReason());
            setError('No se pudo mostrar el popup de Google. Verifica la configuración.');
          }
        });
      } catch (err) {
        console.error('Error al mostrar Google prompt:', err);
        setError('Error al iniciar Google Sign-In');
      }
    } else {
      setError('Google Sign-In no está cargado. Intenta recargar la página.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>💰 Finanzas Personales</h1>
          <p>{isRegistro ? 'Crea tu cuenta' : 'Inicia sesión'}</p>
        </div>

        {error && (
          <div className="error-box">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tu@email.com"
              required
            />
          </div>

          {isRegistro && (
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Tu nombre"
                required
              />
            </div>
          )}

          {isRegistro && (
            <div className="form-group">
              <label>Teléfono</label>
              <div className="phone-input">
                <select 
                  value={formData.codigoPais}
                  onChange={(e) => setFormData({ ...formData, codigoPais: e.target.value })}
                  className="codigo-pais"
                >
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+54">🇦🇷 +54</option>
                  <option value="+56">🇨🇱 +56</option>
                  <option value="+57">🇨🇴 +57</option>
                  <option value="+51">🇵🇪 +51</option>
                  <option value="+58">🇻🇪 +58</option>
                  <option value="+593">🇪🇨 +593</option>
                  <option value="+591">🇧🇴 +591</option>
                </select>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="1234567890"
                  required
                  minLength={10}
                  maxLength={10}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {isRegistro && (
            <div className="form-group">
              <label>Confirmar Contraseña</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Cargando...' : isRegistro ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="divider">
          <span>o continuar con</span>
        </div>

        {/* Botón de Google renderizado por Google */}
        <div id="googleSignInButton" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}></div>

        <div className="login-footer">
          <p>
            {isRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button 
              type="button"
              onClick={() => {
                setIsRegistro(!isRegistro);
                setError('');
                setFormData({ email: '', nombre: '', password: '', confirmPassword: '' });
              }}
              className="btn-link"
            >
              {isRegistro ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
