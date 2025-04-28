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
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    }
    return null;
  } catch (error) {
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

    // Sync database models
    await sequelize.sync({ force: true });
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
