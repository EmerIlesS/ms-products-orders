import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { Order, OrderItem } from '../models/order.model';
import { sequelize } from '../config/database';
import { GraphQLError } from 'graphql';

interface Context {
  user?: {
    id: string;
    role: string;
  };
}

interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: string;
}

interface CategoryInput {
  name: string;
  description: string;
}

interface OrderItemInput {
  productId: string;
  quantity: number;
}

interface OrderInput {
  items: OrderItemInput[];
}

export const resolvers = {
  Query: {
    products: async (_: any, { categoryId }: { categoryId?: string }) => {
      const where = categoryId ? { categoryId } : {};
      return Product.findAll({ where });
    },

    product: async (_: any, { id }: { id: string }) => {
      return Product.findByPk(id);
    },

    categories: async (_: any) => {
      return Category.findAll();
    },

    category: async (_: any, { id }: { id: string }) => {
      return Category.findByPk(id);
    },

    orders: async (_: any, __: any, { user }: Context) => {
      if (!user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return Order.findAll({ where: { userId: user.id } });
    },

    order: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      const order = await Order.findByPk(id);
      if (order?.userId !== user.id && user.role !== 'admin') {
        throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
      }
      return order;
    },
  },

  Mutation: {
    createProduct: async (_: any, { input }: { input: ProductInput }, { user }: Context) => {
      if (!user || user.role !== 'admin') {
        throw new GraphQLError('Only admins can create products', { extensions: { code: 'FORBIDDEN' } });
      }
      return Product.create(input);
    },

    updateProduct: async (_: any, { id, input }: { id: string, input: ProductInput }, { user }: Context) => {
      if (!user || user.role !== 'admin') {
        throw new GraphQLError('Only admins can update products', { extensions: { code: 'FORBIDDEN' } });
      }
      const product = await Product.findByPk(id);
      if (!product) throw new Error('Product not found');
      await product.update(input);
      return product;
    },

    deleteProduct: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user || user.role !== 'admin') {
        throw new GraphQLError('Only admins can delete products', { extensions: { code: 'FORBIDDEN' } });
      }
      const product = await Product.findByPk(id);
      if (!product) throw new Error('Product not found');
      await product.destroy();
      return true;
    },

    createCategory: async (_: any, { input }: { input: CategoryInput }, { user }: Context) => {
      if (!user || user.role !== 'admin') {
        throw new GraphQLError('Only admins can create categories', { extensions: { code: 'FORBIDDEN' } });
      }
      return Category.create(input);
    },

    deleteCategory: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user || user.role !== 'admin') {
        throw new GraphQLError('Only admins can delete categories', { extensions: { code: 'FORBIDDEN' } });
      }
      const category = await Category.findByPk(id);
      if (!category) throw new Error('Category not found');
      await category.destroy();
      return true;
    },

    createOrder: async (_: any, { input }: { input: OrderInput }, { user }: Context) => {
      if (!user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });

      const transaction = await sequelize.transaction();

      try {
        // Create order
        const order = await Order.create(
          {
            userId: user.id,
            status: 'pending',
            total: 0,
          },
          { transaction }
        );

        let total = 0;

        // Process each order item
        for (const item of input.items) {
          const product = await Product.findByPk(item.productId);
          if (!product) throw new Error(`Product ${item.productId} not found`);
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product ${product.name}`);
          }

          // Create order item
          await OrderItem.create(
            {
              orderId: order.id,
              productId: product.id,
              quantity: item.quantity,
              price: product.price,
              subtotal: product.price * item.quantity,
            },
            { transaction }
          );

          // Update product stock
          await product.update(
            {
              stock: product.stock - item.quantity,
            },
            { transaction }
          );

          total += product.price * item.quantity;
        }

        // Update order total
        await order.update({ total }, { transaction });

        await transaction.commit();
        return order;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },

    updateOrderStatus: async (_: any, { id, status }: { id: string, status: 'pending' | 'processing' | 'completed' | 'cancelled' }, { user }: Context) => {
      if (!user || user.role !== 'admin') {
        throw new GraphQLError('Only admins can update order status', { extensions: { code: 'FORBIDDEN' } });
      }

      const order = await Order.findByPk(id);
      if (!order) throw new Error('Order not found');

      await order.update({ status });
      return order;
    },
  },

  Product: {
    category: async (product: Product) => {
      return Category.findByPk(product.categoryId);
    },
    __resolveReference: async (reference: { id: string }) => {
      return Product.findByPk(reference.id);
    },
  },

  Order: {
    items: async (order: Order) => {
      return OrderItem.findAll({
        where: { orderId: order.id },
        include: [{ model: Product, as: 'product' }],
      });
    },
  },
};
