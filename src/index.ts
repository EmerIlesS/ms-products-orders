import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cors from 'cors';

import { sequelize } from './config/database';
import { typeDefs } from './schemas/schema';
import { resolvers } from './resolvers/resolvers';
import { Product } from './models/product.model';
import { Category } from './models/category.model';

dotenv.config();

const app = express();
const port = process.env.PORT || 4002;

// Debug: Verificar la carga del JWT_SECRET
console.log('🔑 JWT_SECRET cargado:', process.env.JWT_SECRET ? `${process.env.JWT_SECRET.substring(0, 10)}...` : 'NO ENCONTRADO');
console.log('🔑 Longitud JWT_SECRET:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

// Context function to handle authentication
const getUser = (token: string) => {
  console.log('🔍 getUser llamado con token:', token ? token.substring(0, 50) + '...' : 'null/undefined');
  
  try {
    if (token) {
      // Verificar el token JWT usando la clave secreta compartida con ms-auth-java
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Extraer correctamente la información del usuario del token JWT
      // El token de ms-auth-java contiene el ID de usuario en 'sub'
      const user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: (decoded.role || decoded.roles || '').toLowerCase() // Normalizar el rol a minúsculas
      };
      
      console.log('🔍 Token decodificado exitosamente:', {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        roleNormalized: user.role,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'no expiration'
      });
      
      return user;
    }
    console.log('⚠️ Token vacío o null recibido');
    return null;
  } catch (error) {
    console.error('❌ Error al verificar token JWT:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

// Configuración de manejo de errores personalizado
const formatError = (error: any) => {
  console.error('GraphQL Error:', error);
  
  // Personalizar mensajes de error según el código
  const errorCode = error.extensions?.code || 'INTERNAL_SERVER_ERROR';
  let message = error.message;
  
  // Mensajes de error personalizados según el código
  switch (errorCode) {
    case 'UNAUTHENTICATED':
      message = message || 'No autenticado. Por favor, inicie sesión para continuar.';
      break;
    case 'FORBIDDEN':
      message = message || 'No autorizado. No tiene permisos suficientes para realizar esta acción.';
      break;
    case 'BAD_USER_INPUT':
      message = message || 'Datos de entrada inválidos. Por favor, verifique la información proporcionada.';
      break;
    case 'NOT_FOUND':
      message = message || 'Recurso no encontrado.';
      break;
    case 'INTERNAL_SERVER_ERROR':
      // Para errores internos, no exponer detalles técnicos al cliente
      message = 'Error interno del servidor. Por favor, inténtelo de nuevo más tarde.';
      break;
  }
  
  return {
    message,
    extensions: {
      code: errorCode,
      // Solo incluir stack trace en desarrollo
      ...(process.env.NODE_ENV === 'development' ? { stacktrace: error.extensions?.stacktrace } : {})
    }
  };
};

// Create Apollo Server
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  formatError,
});

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync database models (alter: true para actualizar tablas sin eliminar datos)
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized.');

    await server.start();
      app.use(
      '/graphql',
      cors<cors.CorsRequest>(),
      express.json(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          console.log('🔍 CONTEXT - Headers recibidos:', {
            authorization: req.headers.authorization ? 'Presente' : 'Ausente',
            contentType: req.headers['content-type'],
            userAgent: req.headers['user-agent']?.substring(0, 50)
          });
          
          const token = req.headers.authorization || '';
          console.log('🔍 CONTEXT - Token antes de procesar:', token ? token.substring(0, 50) + '...' : 'null/undefined');
          
          const cleanToken = token.replace('Bearer ', '');
          console.log('🔍 CONTEXT - Token después de limpiar Bearer:', cleanToken ? cleanToken.substring(0, 50) + '...' : 'null/undefined');
          
          const user = getUser(cleanToken);
          console.log('🔍 CONTEXT - Usuario final a pasar a resolvers:', user);
          
          return { user };
        },
      })
    );    // Endpoint para verificar el estado del servicio
    app.get('/health', async (req, res) => {
      try {
        // Verificar conexión a la base de datos
        await sequelize.authenticate();
        
        // Contar productos para verificar que todo funcione
        const productCount = await Product.count();
        const categoryCount = await Category.count();
        
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          db_connection: 'ok',
          product_count: productCount,
          category_count: categoryCount,
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development'
        });
      } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    });
    
    app.listen(port, () => {
      console.log(`🚀 Products-Orders service ready at http://localhost:${port}/graphql`);
      console.log(`Health check available at http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
