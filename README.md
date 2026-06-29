# 🍔 QuickEats — Interfaz de Usuario Delivery

**Aplicación web de persistencia políglota (Oracle XE + MongoDB)** para una plataforma de delivery de comida estilo UberEats/Rappi.

Proyecto Final de **Base de Datos II** (URP 2026-I)

---

## 📋 Descripción

QuickEats es una interfaz web moderna que implementa el patrón de **Persistencia Políglota**, distribuyendo los datos entre:

- **Oracle XE:** Sistema de cobros y estados de cuenta (módulo financiero ACID)
- **MongoDB:** Catálogos de menús y carritos de compra (módulo operacional de alto rendimiento)

---

## 👥 Integrantes

- **Ticona Alvarez, Mathias Hernan** (202010163)
- **Briceño Angulo, Alejandro Jesus** (202112454)

**Profesor:** Yauri Lozano, Eduardo

---

## 🏗️ Arquitectura

### Stack Tecnológico

| Componente | Versión | Rol |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Express | 4.x | Framework HTTP |
| EJS | 3.x | Motor de plantillas |
| MongoDB Driver | 6.x | Conexión NoSQL |
| OracleDB Driver | 6.x | Conexión relacional |

### Base de Datos

```
Delivery_Food (MongoDB)
├── Menu (30 docs) — Catálogos con estructura jerárquica
└── Carrito (30 docs) — Carritos de compra temporales (TTL: 2h)

usr_financiero (Oracle XE)
├── USUARIOS (30 rows)
├── RESTAURANTES (30 rows)
├── COBROS_CLIENTES (30 rows)
└── ESTADO_CUENTA_RESTAURANTE (30 rows)
```

---

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js** 20+ (https://nodejs.org)
- **MongoDB** 5+ corriendo en `localhost:27017`
- **Oracle XE** corriendo en `localhost:1521/xepdb1` con usuario `usr_financiero`

### Instalación

```bash
# 1. Clonar o descargar el repositorio
git clone https://github.com/TuUsuario/interfaz_delivery.git
cd interfaz_delivery

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
npm start
# o directamente: node app.js
```

### Acceso

La aplicación estará disponible en:
```
http://localhost:3000
```

**Dashboard:** http://localhost:3000/
- Menú (MongoDB): http://localhost:3000/menu
- Carrito (MongoDB): http://localhost:3000/carrito
- Cobros (Oracle): http://localhost:3000/cobros
- Restaurantes (Oracle): http://localhost:3000/restaurantes

---

## 📁 Estructura del Proyecto

```
interfaz_delivery/
├── app.js                 # Servidor Express + rutas CRUD
├── package.json           # Dependencias Node
├── public/
│   └── css/
│       └── main.css       # Estilos compartidos (tema oscuro)
├── views/                 # Plantillas EJS
│   ├── index.ejs          # Dashboard (4 stat cards + arquitectura)
│   ├── menu.ejs           # Catálogo de menús (MongoDB)
│   ├── carrito.ejs        # Carritos de compra (MongoDB) con CRUD
│   ├── cobros.ejs         # Cobros a clientes (Oracle) con CRUD
│   └── restaurantes.ejs   # Listado de restaurantes (Oracle)
└── README.md              # Este archivo
```

---

## 🎯 Funcionalidades Implementadas

### Lectura (GET)

| Ruta | Base de Datos | Descripción |
|---|---|---|
| `/` | MongoDB + Oracle | Dashboard con contadores de ambas BDs |
| `/menu` | MongoDB | Listado de catálogos de restaurantes |
| `/carrito` | MongoDB | Carritos con filtro por estado |
| `/cobros` | Oracle | Cobros ordenados cronológicamente (DESC) |
| `/restaurantes` | Oracle | Listado de restaurantes |

### Escritura (POST)

#### Oracle
- `POST /cobros` — Insertar nuevo cobro desde formulario
- `POST /cobros/simular` — Insertar cobro aleatorio (demo)
- `POST /cobros/:id/estado` — Cambiar estado de un cobro

#### MongoDB
- `POST /carrito` — Insertar nuevo carrito desde formulario
- `POST /carrito/simular` — Insertar/actualizar carrito (upsert)
- `POST /carrito/:id/delete` — Eliminar carrito

---

## 🔐 Seguridad Implementada

### Oracle XE

- **RBAC:** Roles `ROLE_BACKEND_DELIVERY` y `ROLE_FINANZAS_AUDITOR` con privilegios mínimos
- **Sin DELETE:** Historial financiero inmutable
- **Auditoría Unificada:** `policy_fraude_financiero` registra INSERT/UPDATE/DELETE sobre `ESTADO_CUENTA_RESTAURANTE`

### MongoDB

- **Validación de Esquema:** `$jsonSchema` con `validationLevel: "strict"`
- **Índices de Seguridad:**
  - Índice único en `restaurante_id` (Menu)
  - Índice único en `usuario_id` (Carrito)
  - Índice TTL: eliminación automática tras 2 horas

---

## 📊 Modelos de Datos

### MongoDB — Menu

```json
{
  "restaurante_id": 1,
  "nombre_restaurante": "Don Belisario S.A.C.",
  "categorias": [
    {
      "nombre_categoria": "Platos de Fondo",
      "items": [
        { "plato_id": "p_beli_01", "nombre": "Lomo Saltado", "precio": 28.90, "disponible": true }
      ]
    }
  ]
}
```

### MongoDB — Carrito

```json
{
  "usuario_id": 1,
  "restaurante_id": 1,
  "items": [
    { "plato_id": "p_beli_01", "nombre_plato": "Lomo Saltado", "cantidad": 2, "notas": "Sin cebolla" }
  ],
  "monto_total": 57.80,
  "estado": "ACTIVO",
  "ultima_actualizacion": "2026-06-29T12:34:56.789Z"
}
```

### Oracle — COBROS_CLIENTES

```sql
id_cobro | id_usuario | monto_total | metodo_pago | estado_pago | fecha_pago
    1    |     5      |    78.50    |    YAPE     |   PAGADO    | 29/06/2026 12:34
```

---

## 🐛 Solución de Problemas

### Error: "Cannot find module 'mongodb'"
```bash
npm install
```

### Error: E11000 duplicate key (MongoDB)
El índice único en `usuario_id` (Carrito) impide dos carritos simultáneos del mismo usuario.
**Solución:** La ruta `POST /carrito/simular` usa **upsert** para actualizar en lugar de insertar.

### Error: "ORA-00942: table or view does not exist"
Las tablas de Oracle no existen.
**Solución:** Ejecuta los scripts SQL de creación (`DB_Financiera_PROD.sql`) como usuario `usr_financiero`.

### Error: "Error: connect ECONNREFUSED"
MongoDB u Oracle no están corriendo.
**Solución:**
```bash
# MongoDB (en otra terminal)
mongod

# Oracle (según tu instalación)
sqlplus /nolog
SQL> CONNECT sys/password AS SYSDBA
SQL> STARTUP
```

---

## 📝 Variables de Entorno (Opcional)

Para usar `.env`, instala `dotenv`:
```bash
npm install dotenv
```

Crea `.env` en la raíz:
```
MONGO_URI=mongodb://localhost:27017
MONGO_DB=Delivery_Food
ORACLE_USER=usr_financiero
ORACLE_PASSWORD=Finanzas2026#
ORACLE_CONNECT_STRING=localhost:1521/xepdb1
PORT=3000
```

Luego en `app.js`:
```javascript
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;
// ...
```

---

## 🚦 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start
node app.js

# Ver logs en vivo
npm start 2>&1 | tee app.log

# Verificar conexiones en MongoDB
mongosh
> use Delivery_Food
> db.Menu.countDocuments()
> db.Carrito.countDocuments()

# Verificar conexiones en Oracle
sqlplus usr_financiero/Finanzas2026#@localhost:1521/xepdb1
SQL> SELECT COUNT(*) FROM restaurantes;
```

---

## 📖 Documentación

- **Informe Completo:** Ver `Informe_Final_BD2_QuickEats.md`
- **Scripts SQL:** `DB_Financiera_PROD.sql`, `configuracion_seguridad.sql`
- **Guía Oracle:** `ORACLE_GUIA.md`

---

## ✅ Checklist de Entrega

- [x] **Diseño (Secc. 3):** ER, tablas Oracle, colecciones MongoDB, índices, seguridad RBAC
- [x] **Implementación (Secc. 4):** 30 registros por tabla/colección, exportaciones
- [x] **Pruebas CRUD (Secc. 5):** INSERT, SELECT, UPDATE, DELETE en consola + auditoría
- [x] **Interfaz (Secc. 6):** Express + EJS con 5 vistas, mapeo Oracle/MongoDB correcto
- [x] **Código Limpio:** sin bugs conocidos, estilos centralizados, manejo de errores

---

## 🎓 Rúbrica del Proyecto (URP BD2)

| Sección | Puntuación | Estado |
|---|---|---|
| 1. Definición del tema | - | ✅ Delivery de comida |
| 2. Contexto e investigación | 3 pts | ✅ Justificación Oracle/MongoDB |
| 3. Diseño de BD | 5 pts | ✅ Modelos ER y documentos |
| 4. Implementación | 5 pts | ✅ Tablas + colecciones + 30 registros |
| 5. Pruebas CRUD | 5 pts | ✅ Ejecución en consola + Auditoría |
| 6. Interfaz | 2 pts | ✅ Express + EJS funcional |
| **TOTAL** | **20 pts** | ✅ |

---

## 📬 Contacto

Para dudas sobre el proyecto:
- **Mathias Ticona:** mathias.ticona@urp.edu.pe
- **Alejandro Briceño:** 202112454@urp.edu.pe

---

**Última actualización:** Junio 2026
**Licencia:** Proyecto académico URP — Libre para propósitos educativos
