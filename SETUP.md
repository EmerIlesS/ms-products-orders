# 🐘 Configuración de PostgreSQL para ms-products-orders

## 📋 **Opciones para configurar PostgreSQL:**

### **Opción 1: PostgreSQL con Docker (Recomendado)**

```bash
# Levantar PostgreSQL en Docker
docker run -d \
  --name postgres-products \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ecommerce \
  -p 5432:5432 \
  postgres:15-alpine

# Verificar que esté corriendo
docker ps
```

### **Opción 2: PostgreSQL instalado localmente**

Si tienes PostgreSQL instalado en Windows:

```sql
-- Conectar a PostgreSQL como superusuario
-- Crear la base de datos
CREATE DATABASE ecommerce;

-- Crear usuario (opcional)
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE ecommerce TO postgres;
```

### **Opción 3: Usar SQLite para desarrollo (más simple)**

Si prefieres no instalar PostgreSQL, puedes cambiar temporalmente a SQLite:

1. **Instalar SQLite:**
   ```bash
   cd ms-products-orders
   npm install sqlite3
   ```

2. **Modificar `config/database.ts`:**
   ```typescript
   export const sequelize = new Sequelize({
     dialect: 'sqlite',
     storage: './database.sqlite',
     logging: console.log,
   });
   ```

## 🔧 **Configuración actual del .env:**

```bash
# ✅ Ya configurado
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ecommerce
JWT_SECRET=my-super-secret-jwt-key-for-development-that-is-256-bits-long-and-secure-enough
PORT=4002
```

## 🚀 **Para correr el servicio:**

```bash
# 1. Asegúrate de que PostgreSQL esté corriendo
# 2. Instalar dependencias (si no están instaladas)
cd ms-products-orders
npm install

# 3. Correr el servicio
npm start
```

## ✅ **Verificar que funciona:**

1. **Health check:**
   ```bash
   curl http://localhost:4002/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'
   ```

2. **GraphQL Playground:** `http://localhost:4002/graphql`

## ⚠️ **Importante:**

- **JWT_SECRET debe ser igual** en ambos servicios (ms-auth-java y ms-products-orders)
- El servicio creará las tablas automáticamente la primera vez
- Si usas Docker, asegúrate de que el puerto 5432 no esté ocupado

## 🐛 **Troubleshooting:**

### Error de conexión a PostgreSQL:
```bash
# Verificar que PostgreSQL esté corriendo
docker ps
# o
pg_isready -h localhost -p 5432
```

### Error de JWT:
- Verifica que JWT_SECRET sea idéntico en ambos servicios
- Debe tener al menos 32 caracteres

### Puerto ocupado:
```bash
# Ver qué está usando el puerto 4002
netstat -ano | findstr :4002
```
