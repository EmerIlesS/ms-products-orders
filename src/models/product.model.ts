import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ProductAttributes {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  images: string[];
  category: string;
  categoryId: string;
  stock: number;
  rating?: number;
  reviews?: number;
  featured: boolean;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCreationAttributes extends Omit<ProductAttributes, 'id'> {}

export class Product extends Model<ProductAttributes, ProductCreationAttributes> {
  declare id: string;
  declare name: string;
  declare description: string;
  declare price: number;
  declare originalPrice?: number;
  declare discount?: number;
  declare image: string;
  declare images: string[];
  declare category: string;
  declare categoryId: string;
  declare stock: number;
  declare rating?: number;
  declare reviews?: number;
  declare featured: boolean;
  declare active: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    discount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '', // Agregar valor por defecto
    },
    images: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'General', // Agregar valor por defecto
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Categories',
        key: 'id',
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
      defaultValue: 0,
    },
    reviews: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'Products',
    timestamps: true,
  }
);
