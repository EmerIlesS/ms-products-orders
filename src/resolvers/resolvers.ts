import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { Order, OrderItem } from '../models/order.model';
import { sequelize } from '../config/database';
import { GraphQLError } from 'graphql';
import { Op } from 'sequelize';
import { isAuthenticated, isOwner } from '../middleware/authMiddleware';

interface Context {
  user?: {
    id: string;
    email?: string;
    role: string;
  };
}

interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  imageUrls?: string[];
  mainImageUrl?: string;
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
    products: async (_: any, { categoryId, searchName, minPrice, maxPrice, limit = 10, offset = 0, sortBy = 'name', sortOrder = 'ASC' }: { categoryId?: string, searchName?: string, minPrice?: number, maxPrice?: number, limit?: number, offset?: number, sortBy?: string, sortOrder?: 'ASC' | 'DESC' }) => {
      // Construir condiciones de búsqueda
      let where: any = {};
      
      // Filtro por categoría
      if (categoryId) {
        where.categoryId = categoryId;
      }
      
      // Búsqueda por nombre (usando LIKE para búsqueda parcial)
      if (searchName) {
        where.name = {
          [Op.like]: `%${searchName}%`
        };
      }
      
      // Filtro por rango de precios
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) {
          where.price[Op.gte] = minPrice;
        }
        if (maxPrice !== undefined) {
          where.price[Op.lte] = maxPrice;
        }
      }
      
      // Ejecutar consulta optimizada para paginación
      return Product.findAll({ 
        where,
        limit,
        offset,
        order: [[sortBy, sortOrder]]
      });
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

    orders: async (_: any, { status }: { status?: 'pending' | 'processing' | 'completed' | 'cancelled' }, { user }: Context) => {
      if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
      
      // Construir condiciones de búsqueda
      let where: any = {};
      
      // Si es admin o vendedor, puede ver todas las órdenes
      if (user.role !== 'admin' && user.role !== 'seller') {
        // Si es cliente, solo puede ver sus propias órdenes
        where.userId = user.id;
      }
      
      // Filtrar por estado si se proporciona
      if (status) {
        where.status = status;
      }
      
      return Order.findAll({ 
        where,
        order: [['createdAt', 'DESC']]
      });
    },

    order: async (_: any, { id }: { id: string }, context: Context) => {
      const user = isAuthenticated(context);
      
      const order = await Order.findByPk(id);
      if (!order) throw new GraphQLError('Orden no encontrada', { extensions: { code: 'NOT_FOUND' } });
      
      // Verificar que el usuario sea el propietario de la orden o un administrador
      if (user.role !== 'admin') {
        isOwner(context, order.userId);
      }
      return order;
    },
  },

  Mutation: {
    createProduct: async (_: any, { input }: { input: ProductInput }, { user }: Context) => {
      if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
        throw new GraphQLError('Solo administradores y vendedores pueden crear productos', { extensions: { code: 'FORBIDDEN' } });
      }
      
      // Validación de datos de entrada
      if (input.price <= 0) {
        throw new GraphQLError('El precio debe ser mayor que cero', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      
      if (input.stock < 0) {
        throw new GraphQLError('El stock no puede ser negativo', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      
      // Verificar que la categoría existe
      const category = await Category.findByPk(input.categoryId);
      if (!category) {
        throw new GraphQLError('La categoría especificada no existe', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      
      // Preparar los datos para la creación del producto
      const productData = {
        ...input,
        // Si no se proporciona imageUrls, crear un array con imageUrl
        imageUrls: input.imageUrls || (input.imageUrl ? [input.imageUrl] : []),
        // Si no se proporciona mainImageUrl, usar imageUrl o el primer elemento de imageUrls
        mainImageUrl: input.mainImageUrl || input.imageUrl || (input.imageUrls && input.imageUrls.length > 0 ? input.imageUrls[0] : '')
      };
      
      return Product.create(productData);
    },

    updateProduct: async (_: any, { id, input }: { id: string, input: ProductInput }, { user }: Context) => {
      if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
        throw new GraphQLError('Solo administradores y vendedores pueden actualizar productos', { extensions: { code: 'FORBIDDEN' } });
      }
      
      const product = await Product.findByPk(id);
      if (!product) throw new GraphQLError('Producto no encontrado', { extensions: { code: 'NOT_FOUND' } });
      
      // Validación de datos de entrada
      if (input.price !== undefined && input.price <= 0) {
        throw new GraphQLError('El precio debe ser mayor que cero', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      
      if (input.stock !== undefined && input.stock < 0) {
        throw new GraphQLError('El stock no puede ser negativo', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      
      // Verificar que la categoría existe si se está actualizando
      if (input.categoryId) {
        const category = await Category.findByPk(input.categoryId);
        if (!category) {
          throw new GraphQLError('La categoría especificada no existe', { extensions: { code: 'BAD_USER_INPUT' } });
        }
      }
      
      // Preparar los datos para la actualización del producto
      const productData = {
        ...input,
        // Si se proporciona imageUrl pero no imageUrls, actualizar imageUrls
        imageUrls: input.imageUrls || (input.imageUrl ? [input.imageUrl] : undefined),
        // Si se proporciona imageUrl pero no mainImageUrl, actualizar mainImageUrl
        mainImageUrl: input.mainImageUrl || input.imageUrl || undefined
      };
      
      await product.update(productData);
      return product;
    },

    deleteProduct: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
        throw new GraphQLError('Solo administradores y vendedores pueden eliminar productos', { extensions: { code: 'FORBIDDEN' } });
      }
      
      const product = await Product.findByPk(id);
      if (!product) throw new GraphQLError('Producto no encontrado', { extensions: { code: 'NOT_FOUND' } });
      
      await product.destroy();
      return true;
    },    createCategory: async (_: any, { input }: { input: CategoryInput }, { user }: Context) => {
      if (!user || user.role.toLowerCase() !== 'admin') {
        throw new GraphQLError('Only admins can create categories', { extensions: { code: 'FORBIDDEN' } });
      }
      return Category.create(input);
    },    deleteCategory: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user || user.role.toLowerCase() !== 'admin') {
        throw new GraphQLError('Only admins can delete categories', { extensions: { code: 'FORBIDDEN' } });
      }
      const category = await Category.findByPk(id);
      if (!category) throw new Error('Category not found');
      await category.destroy();
      return true;
    },

    updateCategory: async (_: any, { id, input }: { id: string, input: CategoryInput }, { user }: Context) => {
      if (!user || user.role !== 'admin') {
        throw new GraphQLError('Solo administradores pueden actualizar categorías', { extensions: { code: 'FORBIDDEN' } });
      }
      
      const category = await Category.findByPk(id);
      if (!category) throw new GraphQLError('Categoría no encontrada', { extensions: { code: 'NOT_FOUND' } });
      
      await category.update(input);
      return category;
    },

    createOrder: async (_: any, { input }: { input: OrderInput }, { user }: Context) => {
      if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
      
      // Verificar que el usuario tenga el rol de cliente
      if (user.role !== 'customer') {
        throw new GraphQLError('Solo los clientes pueden crear órdenes', { extensions: { code: 'FORBIDDEN' } });
      }

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
      if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
        throw new GraphQLError('Solo administradores y vendedores pueden actualizar el estado de las órdenes', { extensions: { code: 'FORBIDDEN' } });
      }

      const order = await Order.findByPk(id);
      if (!order) throw new GraphQLError('Orden no encontrada', { extensions: { code: 'NOT_FOUND' } });

      await order.update({ status });
      return order;
    },

    cancelOrder: async (_: any, { id }: { id: string }, context: Context) => {
      const order = await Order.findByPk(id);
      if (!order) throw new GraphQLError('Orden no encontrada', { extensions: { code: 'NOT_FOUND' } });
      
      // Validar que el usuario sea el propietario de la orden
      isOwner(context, order.userId);
      
      // Verificar que la orden esté en estado pendiente
      if (order.status !== 'pending') {
        throw new GraphQLError('Solo se pueden cancelar órdenes en estado pendiente', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      
      await order.update({ status: 'cancelled' });
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
