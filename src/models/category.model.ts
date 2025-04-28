import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Product } from './product.model';

interface CategoryAttributes {
  id: string;
  name: string;
  description: string;
}

interface CategoryCreationAttributes extends Omit<CategoryAttributes, 'id'> {}

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> {
  declare id: string;
  declare name: string;
  declare description: string;
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
  as: 'category',
});
