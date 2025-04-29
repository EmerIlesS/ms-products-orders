"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gateway_1 = require("@apollo/gateway");
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = require("body-parser");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
// Configure Gateway
const gateway = new gateway_1.ApolloGateway({
    serviceList: [
        { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql' },
        { name: 'products', url: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4002/graphql' },
    ],
});
async function startServer() {
    try {
        // Create Apollo Server
        const server = new server_1.ApolloServer({
            gateway,
            plugins: [],
        });
        // Start the server
        await server.start();
        // Apply middleware
        app.use('/graphql', (0, cors_1.default)(), (0, body_parser_1.json)(), (0, express4_1.expressMiddleware)(server, {
            context: async ({ req }) => ({
                token: req.headers.authorization,
            }),
        }));
        // Start Express server
        app.listen(port, () => {
            console.log(`🚀 Gateway ready at http://localhost:${port}/graphql`);
        });
    }
    catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}
startServer();
