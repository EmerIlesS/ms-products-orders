import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Product } from './product.model';

interface CategoryAttributes {
  id: string;
  name: string;
  description: string;
  icon?: string;
  image?: string;
  productsCount: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CategoryCreationAttributes extends Omit<CategoryAttributes, 'id'> {}

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> {
  declare id: string;
  declare name: string;
  declare description: string;
  declare icon?: string;
  declare image?: string;
  declare productsCount: number;
  declare active: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    productsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'Categories',
    timestamps: true,
  }
);

// Define la relación con Product
Category.hasMany(Product, {
  sourceKey: 'id',
  foreignKey: 'categoryId',
  as: 'products',
});

Product.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'categoryInfo', // Cambiar el alias para evitar conflicto
});
