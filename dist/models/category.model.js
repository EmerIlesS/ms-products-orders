"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const product_model_1 = require("./product.model");
class Category extends sequelize_1.Model {
}
exports.Category = Category;
Category.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'Categories',
    timestamps: true,
});
// Define la relación con Product
Category.hasMany(product_model_1.Product, {
    sourceKey: 'id',
    foreignKey: 'categoryId',
    as: 'products',
});
product_model_1.Product.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category',
});
