"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItem = exports.Order = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const product_model_1 = require("./product.model");
class Order extends sequelize_1.Model {
}
exports.Order = Order;
class OrderItem extends sequelize_1.Model {
}
exports.OrderItem = OrderItem;
Order.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'processing', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
    },
    total: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'Orders',
    timestamps: true,
});
OrderItem.init({
    orderId: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        references: {
            model: 'Orders',
            key: 'id',
        },
    },
    productId: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        references: {
            model: 'Products',
            key: 'id',
        },
    },
    quantity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    price: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    subtotal: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'OrderItems',
    timestamps: true,
});
// Define relationships
Order.belongsToMany(product_model_1.Product, {
    through: OrderItem,
    as: 'products',
    foreignKey: 'orderId',
});
product_model_1.Product.belongsToMany(Order, {
    through: OrderItem,
    as: 'orders',
    foreignKey: 'productId',
});
