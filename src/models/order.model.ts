import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Product } from './product.model';

interface OrderAttributes {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total: number;
}

interface OrderCreationAttributes extends Omit<OrderAttributes, 'id'> {}

export class Order extends Model<OrderAttributes, OrderCreationAttributes> {
  declare id: string;
  declare userId: string;
  declare status: 'pending' | 'processing' | 'completed' | 'cancelled';
  declare total: number;
}

// Order Items (junction table between Order and Product)
interface OrderItemAttributes {
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export class OrderItem extends Model<OrderItemAttributes> {
  declare orderId: string;
  declare productId: string;
  declare quantity: number;
  declare price: number;
  declare subtotal: number;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'Orders',
    timestamps: true,
  }
);

OrderItem.init(
  {
    orderId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: 'Orders',
        key: 'id',
      },
    },
    productId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: 'Products',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'OrderItems',
    timestamps: true,
  }
);

// Define relationships
Order.belongsToMany(Product, {
  through: OrderItem,
  as: 'products',
  foreignKey: 'orderId',
});

Product.belongsToMany(Order, {
  through: OrderItem,
  as: 'orders',
  foreignKey: 'productId',
});
