const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // ObjectId importado aquí (corrección)
const oracledb = require('oracledb');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
const MONGO_URI = 'mongodb://localhost:27017';
const MONGO_DB = 'Delivery_Food';
const ORA_CONFIG = {
  user: 'usr_financiero',
  password: 'Finanzas2026#',
  connectString: 'localhost:1521/xepdb1'
};

// ── CONEXIONES ────────────────────────────────────────────────────────────────
let mongoDB;

async function initConnections() {
  try {
    const mongoClient = await MongoClient.connect(MONGO_URI);
    mongoDB = mongoClient.db(MONGO_DB);
    console.log('✅ MongoDB conectado');
  } catch (e) {
    console.error('❌ MongoDB error:', e.message);
  }
  try {
    const conn = await oracledb.getConnection(ORA_CONFIG);
    await conn.close();
    console.log('✅ Oracle XE conectado');
  } catch (e) {
    console.error('❌ Oracle error:', e.message);
  }
}

// ── HELPER ORACLE ─────────────────────────────────────────────────────────────
async function queryOracle(sql, params = []) {
  let conn;
  try {
    conn = await oracledb.getConnection(ORA_CONFIG);
    const result = await conn.execute(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true
    });
    return result.rows || [];
  } finally {
    if (conn) await conn.close();
  }
}

// ── RUTAS GET ─────────────────────────────────────────────────────────────────

app.get('/', async (req, res) => {
  try {
    const [menuCount, carritoCount] = await Promise.all([
      mongoDB.collection('Menu').countDocuments(),
      mongoDB.collection('Carrito').countDocuments()
    ]);
    const [oraC, oraR, oraU] = await Promise.all([
      queryOracle('SELECT COUNT(*) AS TOTAL FROM cobros_clientes'),
      queryOracle('SELECT COUNT(*) AS TOTAL FROM restaurantes'),
      queryOracle('SELECT COUNT(*) AS TOTAL FROM usuarios')
    ]);
    res.render('index', {
      menuCount, carritoCount,
      cobrosTotal: oraC[0]?.TOTAL ?? 0,
      restTotal: oraR[0]?.TOTAL ?? 0,
      usrTotal: oraU[0]?.TOTAL ?? 0
    });
  } catch (e) {
    console.error('Dashboard error:', e.message);
    res.render('index', { menuCount: 0, carritoCount: 0, cobrosTotal: 0, restTotal: 0, usrTotal: 0 });
  }
});

app.get('/menu', async (req, res) => {
  try {
    const menus = await mongoDB.collection('Menu').find().sort({ restaurante_id: 1 }).toArray();
    res.render('menu', { menus });
  } catch (e) {
    res.render('menu', { menus: [] });
  }
});

app.get('/carrito', async (req, res) => {
  try {
    const estado = req.query.estado || '';
    const filtro = estado ? { estado } : {};
    const carritos = await mongoDB.collection('Carrito')
      .find(filtro).sort({ ultima_actualizacion: -1 }).toArray();
    res.render('carrito', { carritos, estado });
  } catch (e) {
    res.render('carrito', { carritos: [], estado: '' });
  }
});

app.get('/cobros', async (req, res) => {
  try {
    const cobros = await queryOracle(
      `SELECT id_cobro, id_usuario, monto_total, metodo_pago, estado_pago,
              TO_CHAR(fecha_pago, 'DD/MM/YYYY HH24:MI') AS fecha_pago
       FROM cobros_clientes
       ORDER BY fecha_pago DESC
       FETCH FIRST 30 ROWS ONLY`
    );
    res.render('cobros', { cobros });
  } catch (e) {
    res.render('cobros', { cobros: [] });
  }
});

app.get('/restaurantes', async (req, res) => {
  try {
    const restaurantes = await queryOracle(
      `SELECT id_restaurante, ruc, razon_social, cuenta_bancaria, estado
       FROM restaurantes ORDER BY id_restaurante`
    );
    res.render('restaurantes', { restaurantes });
  } catch (e) {
    res.render('restaurantes', { restaurantes: [] });
  }
});

// ── RUTAS POST — CRUD Oracle ──────────────────────────────────────────────────

// INSERT cobro (formulario manual)
app.post('/cobros', async (req, res) => {
  const { id_usuario, id_pedido_nosql, monto_total, metodo_pago, token_pasarela } = req.body;
  try {
    await queryOracle(
      `INSERT INTO cobros_clientes
         (id_usuario, id_pedido_nosql, monto_total, metodo_pago, token_pasarela, estado_pago, fecha_pago)
       VALUES (:1, :2, :3, :4, :5, 'PAGADO', SYSTIMESTAMP)`,
      [parseInt(id_usuario), id_pedido_nosql, parseFloat(monto_total), metodo_pago, token_pasarela]
    );
  } catch (e) { console.error('Error INSERT cobro:', e.message); }
  res.redirect('/cobros?ok=1');
});

// SIMULATE INSERT cobro (botón rápido de demo)
app.post('/cobros/simular', async (req, res) => {
  const metodos = ['TARJETA', 'YAPE', 'PLIN'];
  const monto = (Math.random() * 185 + 15).toFixed(2);
  const uid = Math.floor(Math.random() * 30) + 1;
  const nosqlId = '60c7bd2f' + Date.now().toString(16).padStart(16, '0').slice(0, 16);
  const token = 'tok_sim_' + Date.now();
  try {
    await queryOracle(
      `INSERT INTO cobros_clientes
         (id_usuario, id_pedido_nosql, monto_total, metodo_pago, token_pasarela, estado_pago, fecha_pago)
       VALUES (:1, :2, :3, :4, :5, 'PAGADO', SYSTIMESTAMP)`,
      [uid, nosqlId, parseFloat(monto), metodos[uid % 3], token]
    );
  } catch (e) { console.error('Error simular cobro:', e.message); }
  res.redirect('/cobros?ok=1');
});

// UPDATE estado de cobro
app.post('/cobros/:id/estado', async (req, res) => {
  const { nuevo_estado } = req.body;
  try {
    await queryOracle(
      `UPDATE cobros_clientes SET estado_pago = :1 WHERE id_cobro = :2`,
      [nuevo_estado, parseInt(req.params.id)]
    );
  } catch (e) { console.error('Error UPDATE cobro:', e.message); }
  res.redirect('/cobros?ok=1');
});

// ── RUTAS POST — CRUD MongoDB ─────────────────────────────────────────────────

// SIMULATE INSERT carrito (botón rápido de demo)
app.post('/carrito/simular', async (req, res) => {
  // uid basado en timestamp → garantiza unicidad en el índice único de usuario_id
  const uid = Math.floor(Date.now() / 1000) % 90000 + 10000;
  const rid = Math.floor(Math.random() * 30) + 1;
  try {
    await mongoDB.collection('Carrito').insertOne({
      usuario_id: uid,
      restaurante_id: rid,
      items: [{
        plato_id: 'p_sim_01',
        nombre_plato: 'Plato Simulado BD2',
        cantidad: 1,
        notas: 'Registro de simulación CRUD'
      }],
      monto_total: parseFloat((Math.random() * 80 + 10).toFixed(2)),
      estado: 'ACTIVO',
      ultima_actualizacion: new Date()
    });
  } catch (e) { console.error('Error simular carrito:', e.message); }
  res.redirect('/carrito?ok=1');
});

// INSERT carrito (formulario manual)
app.post('/carrito', async (req, res) => {
  try {
    await mongoDB.collection('Carrito').insertOne({
      usuario_id: parseInt(req.body.usuario_id),
      restaurante_id: parseInt(req.body.restaurante_id),
      items: [],
      monto_total: 0,
      estado: 'ACTIVO',
      ultima_actualizacion: new Date()
    });
  } catch (e) { console.error('Error INSERT carrito:', e.message); }
  res.redirect('/carrito?ok=1');
});

// DELETE carrito por _id
app.post('/carrito/:id/delete', async (req, res) => {
  try {
    await mongoDB.collection('Carrito').deleteOne({ _id: new ObjectId(req.params.id) });
  } catch (e) { console.error('Error DELETE carrito:', e.message); }
  res.redirect('/carrito?ok=1');
});

// ── INICIAR SERVIDOR ──────────────────────────────────────────────────────────
initConnections().then(() => {
  app.listen(3000, () => console.log('🚀 Servidor corriendo en http://localhost:3000'));
});
