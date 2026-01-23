import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './App.css';

const API_URL = 'http://localhost:8000';

// Colores para las gráficas
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D', '#C77DFF', '#06FFA5'];

function App() {
  const [transacciones, setTransacciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [balancePorCuenta, setBalancePorCuenta] = useState([]);
  const [mostrarCuentas, setMostrarCuentas] = useState(false);
  const [mostrarGrafica, setMostrarGrafica] = useState(null); // 'ingresos', 'gastos', o null
  const [editando, setEditando] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState("todas");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [balance, setBalance] = useState({ ingresos: 0, gastos: 0, transferencias: 0, balance: 0 });
  const [error, setError] = useState('');
  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    tipo: 'ingreso',
    monto: '',
    categoria: '',
    descripcion: '',
    cuenta: 'Nu',
    cuentaDestino: '',
    fecha: new Date().toISOString().slice(0, 16)
  });

  // Cargar transacciones y balance al iniciar
  useEffect(() => {
    cargarCategorias();
    cargarCuentas();
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [filtroFecha, fechaInicio, fechaFin, busqueda]);

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
      let url = `${API_URL}/transacciones/?filtro=${filtroFecha}`;
      
      if (filtroFecha === "personalizado" && fechaInicio && fechaFin) {
        url += `&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      }
      
      const [resTransacciones, resBalance] = await Promise.all([
        axios.get(url),
        axios.get(`${API_URL}/balance/`)
      ]);
      
      console.log('Transacciones recibidas:', resTransacciones.data);

      // Filtrar por búsqueda localmente
      let transaccionesFiltradas = resTransacciones.data;
      if (busqueda.trim() !== "") {
        const terminoBusqueda = busqueda.toLowerCase();
        transaccionesFiltradas = resTransacciones.data.filter(t =>
          t.descripcion.toLowerCase().includes(terminoBusqueda) ||
          t.categoria.toLowerCase().includes(terminoBusqueda) ||
          t.cuenta.toLowerCase().includes(terminoBusqueda)
        );
      }

      setTransacciones(transaccionesFiltradas);
      setBalance(resBalance.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  const agregarTransaccion = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Si es transferencia, usar endpoint especial
      if (nuevaTransaccion.tipo === 'transferencia') {
        const response = await axios.post(`${API_URL}/transferencia/`, {
          cuenta_origen: nuevaTransaccion.cuenta,
          cuenta_destino: nuevaTransaccion.cuentaDestino,
          monto: parseFloat(nuevaTransaccion.monto),
          descripcion: nuevaTransaccion.descripcion,
          fecha: nuevaTransaccion.fecha
        });
        
        if (response.data.error) {
          setError(response.data.error);
          return;
        }
      } else if (editando) {
        // Actualizar transacción existente
        await axios.put(`${API_URL}/transacciones/${editando}`, {
          tipo: nuevaTransaccion.tipo,
          monto: parseFloat(nuevaTransaccion.monto),
          categoria: nuevaTransaccion.categoria,
          descripcion: nuevaTransaccion.descripcion,
          cuenta: nuevaTransaccion.cuenta,
          fecha: nuevaTransaccion.fecha
        });
        setEditando(null);
      } else {
        // Crear nueva transacción
        await axios.post(`${API_URL}/transacciones/`, {
          tipo: nuevaTransaccion.tipo,
          monto: parseFloat(nuevaTransaccion.monto),
          categoria: nuevaTransaccion.categoria,
          descripcion: nuevaTransaccion.descripcion,
          cuenta: nuevaTransaccion.cuenta,
          fecha: nuevaTransaccion.fecha
        });
      }
      
      setNuevaTransaccion({
        tipo: 'ingreso',
        monto: '',
        categoria: '',
        descripcion: '',
        cuenta: 'Nu',
        cuentaDestino: '',
        fecha: new Date().toISOString().slice(0, 16)
      });
      cargarDatos();
      cargarCuentas();
    } catch (error) {
      console.error('Error al agregar/actualizar transacción:', error);
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Error al procesar la transacción');
      }
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
    setError('');
    setNuevaTransaccion({
      tipo: 'ingreso',
      monto: '',
      categoria: '',
      descripcion: '',
      cuenta: 'Nu',
      cuentaDestino: '',
      fecha: new Date().toISOString().slice(0, 16)
    });
  };

  // Calcular datos para gráficas por categoría
  const calcularDatosPorCategoria = (tipo) => {
    const transaccionesFiltradas = transacciones.filter(t => t.tipo === tipo);
    const categoriaMap = {};
    
    transaccionesFiltradas.forEach(t => {
      if (categoriaMap[t.categoria]) {
        categoriaMap[t.categoria] += t.monto;
      } else {
        categoriaMap[t.categoria] = t.monto;
      }
    });

    return Object.keys(categoriaMap).map(categoria => ({
      name: categoria,
      value: parseFloat(categoriaMap[categoria].toFixed(2))
    })).sort((a, b) => b.value - a.value);
  };

  const toggleGrafica = (tipo) => {
    if (mostrarGrafica === tipo) {
      setMostrarGrafica(null);
    } else {
      setMostrarGrafica(tipo);
      setMostrarCuentas(false);
    }
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
          onClick={() => {
            setMostrarCuentas(!mostrarCuentas);
            setMostrarGrafica(null);
          }}
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
        <div 
          className="card income-card clickable"
          onClick={() => toggleGrafica('ingresos')}
          style={{ cursor: 'pointer' }}
        >
          <h3>Ingresos</h3>
          <p className="positive">${balance.ingresos.toFixed(2)}</p>
          <small style={{ color: '#999', fontSize: '0.8rem', marginTop: '10px', display: 'block' }}>
            📊 Click para ver gráfica
          </small>
        </div>
        <div 
          className="card expense-card clickable"
          onClick={() => toggleGrafica('gastos')}
          style={{ cursor: 'pointer' }}
        >
          <h3>Gastos</h3>
          <p className="negative">${balance.gastos.toFixed(2)}</p>
          <small style={{ color: '#999', fontSize: '0.8rem', marginTop: '10px', display: 'block' }}>
            📊 Click para ver gráfica
          </small>
        </div>        <div className="card transfer-card">
          <h3>Transferencias</h3>
          <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '2rem' }}>
            ${balance.transferencias ? balance.transferencias.toFixed(2) : '0.00'}
          </p>
          <small style={{ color: '#999', fontSize: '0.8rem', marginTop: '10px', display: 'block' }}>
            💸 Movimientos internos
          </small>
        </div>      </div>

      {/* Gráficas por Categoría */}
      {mostrarGrafica && (
        <div className="chart-section">
          <div className="chart-header">
            <h2>
              {mostrarGrafica === 'ingresos' ? '📈 Ingresos' : '📉 Gastos'} por Categoría
            </h2>
            <button 
              className="btn-close-chart" 
              onClick={() => setMostrarGrafica(null)}
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="chart-container">
            {calcularDatosPorCategoria(mostrarGrafica === 'ingresos' ? 'ingreso' : 'gasto').length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={calcularDatosPorCategoria(mostrarGrafica === 'ingresos' ? 'ingreso' : 'gasto')}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {calcularDatosPorCategoria(mostrarGrafica === 'ingresos' ? 'ingreso' : 'gasto').map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="no-data">No hay datos de {mostrarGrafica} para mostrar</p>
            )}
          </div>
        </div>
      )}

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
        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fee', 
            color: '#dc2626', 
            borderRadius: '8px', 
            marginBottom: '15px',
            fontWeight: '600'
          }}>
            ⚠️ {error}
          </div>
        )}
        <form onSubmit={agregarTransaccion}>
          <div className="form-group">
            <label>Tipo:</label>
            <select
              value={nuevaTransaccion.tipo}
              onChange={(e) => {
                setError('');
                setNuevaTransaccion({ ...nuevaTransaccion, tipo: e.target.value, categoria: '', cuentaDestino: '' });
                if (e.target.value !== 'transferencia') {
                  axios.get(`${API_URL}/categorias/${e.target.value}`)
                    .then(res => setCategorias(res.data.categorias));
                }
              }}
            >
              <option value="ingreso">Ingreso</option>
              <option value="gasto">Gasto</option>
              <option value="transferencia">Transferencia</option>
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

          {nuevaTransaccion.tipo !== 'transferencia' && (
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
          )}

          <div className="form-group">
            <label>Descripción:</label>
            <input
              type="text"
              value={nuevaTransaccion.descripcion}
              onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, descripcion: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>{nuevaTransaccion.tipo === 'transferencia' ? 'Cuenta Origen:' : 'Cuenta:'}</label>
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

          {nuevaTransaccion.tipo === 'transferencia' && (
            <div className="form-group">
              <label>Cuenta Destino:</label>
              <select
                value={nuevaTransaccion.cuentaDestino}
                onChange={(e) => setNuevaTransaccion({ ...nuevaTransaccion, cuentaDestino: e.target.value })}
                required
              >
                <option value="">Selecciona cuenta destino</option>
                {cuentas.filter(c => c !== nuevaTransaccion.cuenta).map((cuenta) => (
                  <option key={cuenta} value={cuenta}>{cuenta}</option>
                ))}
              </select>
            </div>
          )}

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
        <div className="transactions-header">
          <h2>Historial de Transacciones</h2>

          {/* Barra de búsqueda */}
          <div className='search-section'>
            <input
             type="text"
             placeholder="🔍 Buscar por descripción, categoría o cuenta..."
             value={busqueda}
             onChange={(e) => setBusqueda(e.target.value)}
             className="search-input"
          />
           {busqueda && (
             <button 
               className="btn-clear-search" 
               onClick={() => setBusqueda("")}
             >
               ✕
             </button>
           )}
          </div>
          
          {/* Filtros de fecha */}
          <div className="filters-section">
            <select 
              value={filtroFecha} 
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="filter-select"
            >
              <option value="todas">Todas</option>
              <option value="hoy">Hoy</option>
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mes</option>
              <option value="anio">Este Año</option>
              <option value="personalizado">Rango Personalizado</option>
            </select>
            
            {filtroFecha === "personalizado" && (
              <div className="date-range">
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  placeholder="Desde"
                />
                <span>hasta</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  placeholder="Hasta"
                />
              </div>
            )}
          </div>
        </div>

        {transacciones.length === 0 ? (
          <p className="no-transactions">No hay transacciones para el filtro seleccionado</p>
        ) : (
          <div className="transactions-list">
            {transacciones.map((t) => (
              <div key={t.id} className={`transaction-item ${t.tipo === 'ingreso' && t.categoria === 'Transferencia' ? 'transferencia' : t.tipo === 'gasto' && t.categoria === 'Transferencia' ? 'transferencia' : t.tipo}`}>
                <div className="transaction-info">
                  <h4>
                    {t.categoria === 'Transferencia' ? '💸 ' : ''}
                    {t.categoria}
                  </h4>
                  <p>{t.descripcion}</p>
                  <small>{new Date(t.fecha).toLocaleString()} • {t.cuenta}</small>
                </div>
                <div className="transaction-amount">
                  <span className={
                    t.tipo === 'transferencia'
                      ? 'transfer' 
                      : t.tipo === 'ingreso' ? 'positive' : 'negative'
                  }>
                    {t.tipo === 'transferencia' 
                      ? (t.monto < 0 ? '+' : '-') + '$' + Math.abs(t.monto).toFixed(2)
                      : (t.tipo === 'ingreso' ? '+' : '-') + '$' + t.monto.toFixed(2)
                    }
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {t.tipo !== 'transferencia' && (
                      <button onClick={() => editarTransaccion(t)} className="btn-edit">
                        ✏️
                      </button>
                    )}
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