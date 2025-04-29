"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const product_model_1 = require("../models/product.model");
const category_model_1 = require("../models/category.model");
const order_model_1 = require("../models/order.model");
const database_1 = require("../config/database");
const graphql_1 = require("graphql");
exports.resolvers = {
    Query: {
        products: async (_, { categoryId }) => {
            const where = categoryId ? { categoryId } : {};
            return product_model_1.Product.findAll({ where });
        },
        product: async (_, { id }) => {
            return product_model_1.Product.findByPk(id);
        },
        categories: async (_) => {
            return category_model_1.Category.findAll();
        },
        category: async (_, { id }) => {
            return category_model_1.Category.findByPk(id);
        },
        orders: async (_, __, { user }) => {
            if (!user)
                throw new graphql_1.GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
            return order_model_1.Order.findAll({ where: { userId: user.id } });
        },
        order: async (_, { id }, { user }) => {
            if (!user)
                throw new graphql_1.GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
            const order = await order_model_1.Order.findByPk(id);
            if ((order === null || order === void 0 ? void 0 : order.userId) !== user.id && user.role !== 'admin') {
                throw new graphql_1.GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
            }
            return order;
        },
    },
    Mutation: {
        createProduct: async (_, { input }, { user }) => {
            if (!user || user.role !== 'admin') {
                throw new graphql_1.GraphQLError('Only admins can create products', { extensions: { code: 'FORBIDDEN' } });
            }
            return product_model_1.Product.create(input);
        },
        updateProduct: async (_, { id, input }, { user }) => {
            if (!user || user.role !== 'admin') {
                throw new graphql_1.GraphQLError('Only admins can update products', { extensions: { code: 'FORBIDDEN' } });
            }
            const product = await product_model_1.Product.findByPk(id);
            if (!product)
                throw new Error('Product not found');
            await product.update(input);
            return product;
        },
        deleteProduct: async (_, { id }, { user }) => {
            if (!user || user.role !== 'admin') {
                throw new graphql_1.GraphQLError('Only admins can delete products', { extensions: { code: 'FORBIDDEN' } });
            }
            const product = await product_model_1.Product.findByPk(id);
            if (!product)
                throw new Error('Product not found');
            await product.destroy();
            return true;
        },
        createCategory: async (_, { input }, { user }) => {
            if (!user || user.role !== 'admin') {
                throw new graphql_1.GraphQLError('Only admins can create categories', { extensions: { code: 'FORBIDDEN' } });
            }
            return category_model_1.Category.create(input);
        },
        deleteCategory: async (_, { id }, { user }) => {
            if (!user || user.role !== 'admin') {
                throw new graphql_1.GraphQLError('Only admins can delete categories', { extensions: { code: 'FORBIDDEN' } });
            }
            const category = await category_model_1.Category.findByPk(id);
            if (!category)
                throw new Error('Category not found');
            await category.destroy();
            return true;
        },
        createOrder: async (_, { input }, { user }) => {
            if (!user)
                throw new graphql_1.GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
            const transaction = await database_1.sequelize.transaction();
            try {
                // Create order
                const order = await order_model_1.Order.create({
                    userId: user.id,
                    status: 'pending',
                    total: 0,
                }, { transaction });
                let total = 0;
                // Process each order item
                for (const item of input.items) {
                    const product = await product_model_1.Product.findByPk(item.productId);
                    if (!product)
                        throw new Error(`Product ${item.productId} not found`);
                    if (product.stock < item.quantity) {
                        throw new Error(`Insufficient stock for product ${product.name}`);
                    }
                    // Create order item
                    await order_model_1.OrderItem.create({
                        orderId: order.id,
                        productId: product.id,
                        quantity: item.quantity,
                        price: product.price,
                        subtotal: product.price * item.quantity,
                    }, { transaction });
                    // Update product stock
                    await product.update({
                        stock: product.stock - item.quantity,
                    }, { transaction });
                    total += product.price * item.quantity;
                }
                // Update order total
                await order.update({ total }, { transaction });
                await transaction.commit();
                return order;
            }
            catch (error) {
                await transaction.rollback();
                throw error;
            }
        },
        updateOrderStatus: async (_, { id, status }, { user }) => {
            if (!user || user.role !== 'admin') {
                throw new graphql_1.GraphQLError('Only admins can update order status', { extensions: { code: 'FORBIDDEN' } });
            }
            const order = await order_model_1.Order.findByPk(id);
            if (!order)
                throw new Error('Order not found');
            await order.update({ status });
            return order;
        },
    },
    Product: {
        category: async (product) => {
            return category_model_1.Category.findByPk(product.categoryId);
        },
        __resolveReference: async (reference) => {
            return product_model_1.Product.findByPk(reference.id);
        },
    },
    Order: {
        items: async (order) => {
            return order_model_1.OrderItem.findAll({
                where: { orderId: order.id },
                include: [{ model: product_model_1.Product, as: 'product' }],
            });
        },
    },
};
