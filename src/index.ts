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
        role: decoded.role || decoded.roles
      };
    }
    return null;
  } catch (error) {
    console.error('Error al verificar token JWT:', error);
    return null;
  }
};

// Create Apollo Server
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
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
