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

dotenv.config();

const app = express();
const port = process.env.PORT || 4002;

// Context function to handle authentication
const getUser = (token: string) => {
  try {
    if (token) {
      // Verificar el token JWT usando la clave secreta compartida con ms-auth-java
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Extraer correctamente la información del usuario del token JWT
      // El token de ms-auth-java contiene el ID de usuario en 'sub'
      return {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: (decoded.role || decoded.roles || '').toLowerCase() // Normalizar el rol a minúsculas
      };
    }
    return null;
  } catch (error) {
    console.error('Error al verificar token JWT:', error);
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
          const token = req.headers.authorization || '';
          const user = getUser(token.replace('Bearer ', ''));
          return { user };
        },
      })
    );

    app.listen(port, () => {
      console.log(`🚀 Products-Orders service ready at http://localhost:${port}/graphql`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
