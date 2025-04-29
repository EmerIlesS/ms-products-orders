"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const subgraph_1 = require("@apollo/subgraph");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const schema_1 = require("./schemas/schema");
const resolvers_1 = require("./resolvers/resolvers");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4002;
// Context function to handle authentication
const getUser = (token) => {
    try {
        if (token) {
            return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        }
        return null;
    }
    catch (error) {
        return null;
    }
};
// Create Apollo Server
const server = new server_1.ApolloServer({
    schema: (0, subgraph_1.buildSubgraphSchema)([{ typeDefs: schema_1.typeDefs, resolvers: resolvers_1.resolvers }]),
});
async function startServer() {
    try {
        // Test database connection
        await database_1.sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        // Sync database models
        await database_1.sequelize.sync({ force: true });
        console.log('Database models synchronized.');
        await server.start();
        app.use('/graphql', (0, cors_1.default)(), express_1.default.json(), (0, express4_1.expressMiddleware)(server, {
            context: async ({ req }) => {
                const token = req.headers.authorization || '';
                const user = getUser(token.replace('Bearer ', ''));
                return { user };
            },
        }));
        app.listen(port, () => {
            console.log(`🚀 Products-Orders service ready at http://localhost:${port}/graphql`);
        });
    }
    catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}
startServer();
