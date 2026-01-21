import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [transacciones, setTransacciones] = useState([]);
  const [balance, setBalance] = useState({ ingresos: 0, gastos: 0, balance: 0 });
  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    tipo: 'ingreso',
    monto: '',
    categoria: '',
    descripcion: '',
    cuenta: 'Principal'
  });

  // Cargar transacciones y balance al iniciar
  useEffect(() => {
    cargarDatos();
  }, []);

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
      await axios.post(`${API_URL}/transacciones/`, {
        ...nuevaTransaccion,
        monto: parseFloat(nuevaTransaccion.monto)
      });
      setNuevaTransaccion({
        tipo: 'ingreso',
        monto: '',
        categoria: '',
        descripcion: '',
        cuenta: 'Principal'
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al agregar transacción:', error);
    }
  };

  const eliminarTransaccion = async (id) => {
    try {
      await axios.delete(`${API_URL}/transacciones/${id}`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>💰 Finanzas Personales</h1>
      </header>

      {/* Tarjetas de Balance */}
      <div className="balance-cards">
        <div className="card balance-card">
          <h3>Balance Total</h3>
          <p className={balance.balance >= 0 ? 'positive' : 'negative'}>
            ${balance.balance.toFixed(2)}
          </p>
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

      {/* Formulario para agregar transacción */}
      <div className="card form-card">
        <h2>Nueva Transacción</h2>
        <form onSubmit={agregarTransaccion}>
          <div className="form-group">
            <label>Tipo:</label>
            <select
              value={nuevaTransaccion.tipo}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, tipo: e.target.value })}
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
            <input
              type="text"
              value={nuevaTransaccion.categoria}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, categoria: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Descripción:</label>
            <input
              type="text"
              value={nuevaTransaccion.descripcion}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, descripcion: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-submit">Agregar</button>
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
                  <small>{new Date(t.fecha).toLocaleDateString()}</small>
                </div>
                <div className="transaction-amount">
                  <span className={t.tipo === 'ingreso' ? 'positive' : 'negative'}>
                    {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toFixed(2)}
                  </span>
                  <button onClick={() => eliminarTransaccion(t.id)} className="btn-delete">
                    🗑️
                  </button>
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