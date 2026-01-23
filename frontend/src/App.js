import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [transacciones, setTransacciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [balancePorCuenta, setBalancePorCuenta] = useState([]);
  const [mostrarCuentas, setMostrarCuentas] = useState(false);
  const [editando, setEditando] = useState(null);
  const [balance, setBalance] = useState({ ingresos: 0, gastos: 0, balance: 0 });
  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    tipo: 'ingreso',
    monto: '',
    categoria: '',
    descripcion: '',
    cuenta: 'HSBC',
    fecha: new Date().toISOString().slice(0, 16) // Formato: YYYY-MM-DDTHH:mm
  });

  // Cargar transacciones y balance al iniciar
  useEffect(() => {
    cargarDatos();
    cargarCategorias();
    cargarCuentas();
  }, []);

  const cargarCategorias = async () => {
    try {
      const res = await axios.get(`${API_URL}/categorias/${nuevaTransaccion.tipo}`);
      setCategorias(res.data.categorias);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const cargarCuentas = async () => {
    try {
      const res = await axios.get(`${API_URL}/cuentas/`);
      setCuentas(res.data.cuentas);
      cargarBalancePorCuenta(res.data.cuentas);
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
    }
  };

  const cargarBalancePorCuenta = async (listaCuentas) => {
    try {
      const promesas = listaCuentas.map(cuenta => 
        axios.get(`${API_URL}/balance/cuenta/${cuenta}`)
      );
      const resultados = await Promise.all(promesas);
      setBalancePorCuenta(resultados.map(r => r.data));
    } catch (error) {
      console.error('Error al cargar balance por cuenta:', error);
    }
  };

  const cargarDatos = async () => {
    try {
      const [resTransacciones, resBalance] = await Promise.all([
        axios.get(`${API_URL}/transacciones/`),
        axios.get(`${API_URL}/balance/`)
      ]);
      setTransacciones(resTransacciones.data);
      setBalance(resBalance.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  const agregarTransaccion = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        // Actualizar transacción existente
        await axios.put(`${API_URL}/transacciones/${editando}`, {
          ...nuevaTransaccion,
          monto: parseFloat(nuevaTransaccion.monto)
        });
        setEditando(null);
      } else {
        // Crear nueva transacción
        await axios.post(`${API_URL}/transacciones/`, {
          ...nuevaTransaccion,
          monto: parseFloat(nuevaTransaccion.monto)
        });
      }
      setNuevaTransaccion({
        tipo: 'ingreso',
        monto: '',
        categoria: '',
        descripcion: '',
        cuenta: 'HSBC',
        fecha: new Date().toISOString().slice(0, 16)
      });
      cargarDatos();
      cargarCuentas();
    } catch (error) {
      console.error('Error al agregar/actualizar transacción:', error);
    }
  };

  const eliminarTransaccion = async (id) => {
    try {
      await axios.delete(`${API_URL}/transacciones/${id}`);
      cargarDatos();
      cargarCuentas();
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
    }
  };

  const editarTransaccion = (transaccion) => {
    setNuevaTransaccion({
      tipo: transaccion.tipo,
      monto: transaccion.monto.toString(),
      categoria: transaccion.categoria,
      descripcion: transaccion.descripcion,
      cuenta: transaccion.cuenta,
      fecha: new Date(transaccion.fecha).toISOString().slice(0, 16)
    });
    setEditando(transaccion.id);
    
    // Cargar categorías del tipo de transacción
    axios.get(`${API_URL}/categorias/${transaccion.tipo}`)
      .then(res => setCategorias(res.data.categorias));
    
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNuevaTransaccion({
      tipo: 'ingreso',
      monto: '',
      categoria: '',
      descripcion: '',
      cuenta: 'HSBC',
      fecha: new Date().toISOString().slice(0, 16)
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>💰 Finanzas Personales</h1>
      </header>

      {/* Tarjetas de Balance */}
      <div className="balance-cards">
        <div 
          className="card balance-card clickable" 
          onClick={() => setMostrarCuentas(!mostrarCuentas)}
          style={{ cursor: 'pointer' }}
        >
          <h3>Balance Total</h3>
          <p className={balance.balance >= 0 ? 'positive' : 'negative'}>
            ${balance.balance.toFixed(2)}
          </p>
          <small style={{ color: '#999', fontSize: '0.8rem', marginTop: '10px', display: 'block' }}>
            👆 Click para ver cuentas
          </small>
        </div>
        <div className="card income-card">
          <h3>Ingresos</h3>
          <p className="positive">${balance.ingresos.toFixed(2)}</p>
        </div>
        <div className="card expense-card">
          <h3>Gastos</h3>
          <p className="negative">${balance.gastos.toFixed(2)}</p>
        </div>
      </div>

      {/* Balance por Cuenta (mostrar/ocultar) */}
      {mostrarCuentas && (
        <div className="accounts-section">
          <div className="accounts-header">
            <h2>Balance por Cuenta</h2>
            <button 
              className="btn-close-accounts" 
              onClick={() => setMostrarCuentas(false)}
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="accounts-grid">
            {balancePorCuenta.map((cuenta) => (
              <div key={cuenta.cuenta} className="card account-card">
                <h3>{cuenta.cuenta}</h3>
                <p className={cuenta.balance >= 0 ? 'positive' : 'negative'}>
                  ${cuenta.balance.toFixed(2)}
                </p>
                <div className="account-details">
                  <span className="positive-small">+${cuenta.ingresos.toFixed(2)}</span>
                  <span className="negative-small">-${cuenta.gastos.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario para agregar transacción */}
      <div className="card form-card">
        <h2>{editando ? '✏️ Editar Transacción' : 'Nueva Transacción'}</h2>
        <form onSubmit={agregarTransaccion}>
          <div className="form-group">
            <label>Tipo:</label>
            <select
              value={nuevaTransaccion.tipo}
              onChange={(e) => {
                setNuevaTransaccion({ ...nuevaTransaccion, tipo: e.target.value, categoria: '' });
                axios.get(`${API_URL}/categorias/${e.target.value}`)
                  .then(res => setCategorias(res.data.categorias));
              }}
            >
              <option value="ingreso">Ingreso</option>
              <option value="gasto">Gasto</option>
            </select>
          </div>

          <div className="form-group">
            <label>Monto:</label>
            <input
              type="number"
              step="0.01"
              value={nuevaTransaccion.monto}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, monto: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Categoría:</label>
            <select
              value={nuevaTransaccion.categoria}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, categoria: e.target.value })}
              required
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Descripción:</label>
            <input
              type="text"
              value={nuevaTransaccion.descripcion}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, descripcion: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Cuenta:</label>
            <select
              value={nuevaTransaccion.cuenta}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, cuenta: e.target.value })}
              required
            >
              {cuentas.map((cuenta) => (
                <option key={cuenta} value={cuenta}>{cuenta}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Fecha y Hora:</label>
            <input
              type="datetime-local"
              value={nuevaTransaccion.fecha}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, fecha: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-submit">
              {editando ? 'Actualizar' : 'Agregar'}
            </button>
            {editando && (
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={cancelarEdicion}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de transacciones */}
      <div className="card transactions-card">
        <h2>Historial de Transacciones</h2>
        {transacciones.length === 0 ? (
          <p className="no-transactions">No hay transacciones todavía</p>
        ) : (
          <div className="transactions-list">
            {transacciones.map((t) => (
              <div key={t.id} className={`transaction-item ${t.tipo}`}>
                <div className="transaction-info">
                  <h4>{t.categoria}</h4>
                  <p>{t.descripcion}</p>
                  <small>{new Date(t.fecha).toLocaleDateString()} • {t.cuenta}</small>
                </div>
                <div className="transaction-amount">
                  <span className={t.tipo === 'ingreso' ? 'positive' : 'negative'}>
                    {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toFixed(2)}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => editarTransaccion(t)} className="btn-edit">
                      ✏️
                    </button>
                    <button onClick={() => eliminarTransaccion(t.id)} className="btn-delete">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;