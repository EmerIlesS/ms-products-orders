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

interface ProductFiltersInput {
  category?: string;
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  active?: boolean;
  inStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface ProductInput {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category?: string;
  categoryId: string;
  stock: number;
  featured?: boolean;
  active?: boolean;
}

interface CategoryInput {
  name: string;
  description: string;
  icon?: string;
  image?: string;
  productsCount?: number;
  active?: boolean;
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
    products: async (_: any, { filters }: { filters?: ProductFiltersInput }) => {
      try {
        const {
          category,
          categoryId,
          search,
          minPrice,
          maxPrice,
          featured,
          active = true,
          inStock,
          page = 1,
          limit = 10,
          sortBy = 'createdAt',
          sortOrder = 'DESC'
        } = filters || {};

        // Construir condiciones de búsqueda
        let where: any = { active };
        
        // Filtro por categoría
        if (categoryId) {
          where.categoryId = categoryId;
        }
        
        if (category) {
          where.category = category;
        }
        
        // Búsqueda por nombre (usando LIKE para búsqueda parcial)
        if (search) {
          where[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } }
          ];
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

        // Filtro por productos destacados
        if (featured !== undefined) {
          where.featured = featured;
        }

        // Filtro por stock
        if (inStock) {
          where.stock = { [Op.gt]: 0 };
        }

        // Calcular offset para paginación
        const offset = (page - 1) * limit;

        // Obtener total de productos y productos paginados
        const { count: total, rows: products } = await Product.findAndCountAll({
          where,
          limit,
          offset,
          order: [[sortBy, sortOrder]],
          include: [{
            model: Category,
            as: 'categoryInfo',
            attributes: ['id', 'name', 'description']
          }]
        });

        // Calcular información de paginación
        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;

        return {
          products,
          total,
          page,
          totalPages,
          hasMore
        };
      } catch (error) {
        console.error('Error en products query:', error);
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    featuredProducts: async (_: any, { limit = 8 }: { limit?: number }) => {
      try {
        return Product.findAll({
          where: { featured: true, active: true },
          limit,
          include: [{
            model: Category,
            as: 'categoryInfo',
            attributes: ['id', 'name', 'description']
          }]
        });
      } catch (error) {
        console.error('Error en featuredProducts query:', error);
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    product: async (_: any, { id }: { id: string }) => {
      try {
        return Product.findByPk(id, {
          include: [{
            model: Category,
            as: 'categoryInfo',
            attributes: ['id', 'name', 'description']
          }]
        });
      } catch (error) {
        console.error('Error en product query:', error);
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    categories: async (_: any) => {
      try {
        return Category.findAll();
      } catch (error) {
        console.error('Error en categories query:', error);
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    category: async (_: any, { id }: { id: string }) => {
      try {
        return Category.findByPk(id);
      } catch (error) {
        console.error('Error en category query:', error);
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    orders: async (_: any, { status }: { status?: 'pending' | 'processing' | 'completed' | 'cancelled' }, { user }: Context) => {
      try {
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        let where: any = {};
        
        if (user.role.toLowerCase() !== 'admin') {
          where.userId = user.id;
        }
        
        if (status) {
          where.status = status;
        }
        
        return Order.findAll({ where });
      } catch (error) {
        console.error('Error en orders query:', error);
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    order: async (_: any, { id }: { id: string }, context: Context) => {
      try {
        const { user } = context;
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        const order = await Order.findByPk(id);
        if (!order) throw new GraphQLError('Orden no encontrada', { extensions: { code: 'NOT_FOUND' } });
        
        // Verificar que el usuario sea el propietario de la orden o un administrador
        if (user.role.toLowerCase() !== 'admin') {
          isOwner(context, order.userId);
        }
        return order;
      } catch (error) {
        console.error('Error en order query:', error);
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },
  },

  Mutation: {
    createProduct: async (_: any, { input }: { input: ProductInput }, context: Context) => {
      try {
        const { user } = context;
        // Verificar autenticación y autorización
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        // Solo admin y vendedores pueden crear productos
        if (!['admin', 'vendor'].includes(user.role.toLowerCase())) {
          throw new GraphQLError('No tienes permisos para crear productos', { extensions: { code: 'FORBIDDEN' } });
        }

        // Verificar que la categoría existe
        const category = await Category.findByPk(input.categoryId);
        if (!category) {
          throw new GraphQLError('Categoría no encontrada', { extensions: { code: 'NOT_FOUND' } });
        }

        // Actualizar el campo category con el nombre de la categoría
        const productData = {
          ...input,
          category: category.name,
          featured: input.featured || false,
          active: input.active !== undefined ? input.active : true,
          images: input.images || []
        };

        const product = await Product.create(productData);
        return product;
      } catch (error) {
        console.error('Error creando producto:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    updateProduct: async (_: any, { id, input }: { id: string, input: ProductInput }, context: Context) => {
      try {
        const { user } = context;
        // Verificar autenticación y autorización
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        // Solo admin y vendedores pueden actualizar productos
        if (!['admin', 'vendor'].includes(user.role.toLowerCase())) {
          throw new GraphQLError('No tienes permisos para actualizar productos', { extensions: { code: 'FORBIDDEN' } });
        }

        const product = await Product.findByPk(id);
        if (!product) {
          throw new GraphQLError('Producto no encontrado', { extensions: { code: 'NOT_FOUND' } });
        }

        // Si se actualiza la categoría, verificar que existe y actualizar el nombre
        let updateData = { ...input };
        if (input.categoryId) {
          const category = await Category.findByPk(input.categoryId);
          if (!category) {
            throw new GraphQLError('Categoría no encontrada', { extensions: { code: 'NOT_FOUND' } });
          }
          updateData.category = category.name;
        }

        await product.update(updateData);
        return product;
      } catch (error) {
        console.error('Error actualizando producto:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    deleteProduct: async (_: any, { id }: { id: string }, context: Context) => {
      try {
        const { user } = context;
        // Verificar autenticación y autorización
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        // Solo admin y vendedores pueden eliminar productos
        if (!['admin', 'vendor'].includes(user.role.toLowerCase())) {
          throw new GraphQLError('No tienes permisos para eliminar productos', { extensions: { code: 'FORBIDDEN' } });
        }

        const product = await Product.findByPk(id);
        if (!product) {
          throw new GraphQLError('Producto no encontrado', { extensions: { code: 'NOT_FOUND' } });
        }

        await product.destroy();
        return true;
      } catch (error) {
        console.error('Error eliminando producto:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    createCategory: async (_: any, { input }: { input: CategoryInput }, context: Context) => {
      try {
        const { user } = context;
        // Verificar autenticación y autorización
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        // Solo admin puede crear categorías
        if (user.role.toLowerCase() !== 'admin') {
          throw new GraphQLError('No tienes permisos para crear categorías', { extensions: { code: 'FORBIDDEN' } });
        }

        const category = await Category.create({
          ...input,
          productsCount: 0,
          active: true
        });
        return category;
      } catch (error) {
        console.error('Error creando categoría:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    deleteCategory: async (_: any, { id }: { id: string }, context: Context) => {
      try {
        const { user } = context;
        // Verificar autenticación y autorización
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        // Solo admin puede eliminar categorías
        if (user.role.toLowerCase() !== 'admin') {
          throw new GraphQLError('No tienes permisos para eliminar categorías', { extensions: { code: 'FORBIDDEN' } });
        }

        const category = await Category.findByPk(id);
        if (!category) {
          throw new GraphQLError('Categoría no encontrada', { extensions: { code: 'NOT_FOUND' } });
        }

        await category.destroy();
        return true;
      } catch (error) {
        console.error('Error eliminando categoría:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    updateCategory: async (_: any, { id, input }: { id: string, input: CategoryInput }, context: Context) => {
      try {
        const { user } = context;
        // Verificar autenticación y autorización
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        // Solo admin puede actualizar categorías
        if (user.role.toLowerCase() !== 'admin') {
          throw new GraphQLError('No tienes permisos para actualizar categorías', { extensions: { code: 'FORBIDDEN' } });
        }

        const category = await Category.findByPk(id);
        if (!category) {
          throw new GraphQLError('Categoría no encontrada', { extensions: { code: 'NOT_FOUND' } });
        }

        await category.update(input);
        return category;
      } catch (error) {
        console.error('Error actualizando categoría:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    createOrder: async (_: any, { input }: { input: OrderInput }, context: Context) => {
      try {
        const { user } = context;
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });

        const transaction = await sequelize.transaction();

        try {
          // Crear la orden
          const order = await Order.create({
            userId: user.id,
            status: 'pending',
            total: 0
          }, { transaction });

          let total = 0;

          // Crear los items de la orden
          for (const item of input.items) {
            const product = await Product.findByPk(item.productId, { transaction });
            if (!product) {
              throw new GraphQLError(`Producto con ID ${item.productId} no encontrado`, { extensions: { code: 'NOT_FOUND' } });
            }

            if (product.stock < item.quantity) {
              throw new GraphQLError(`Stock insuficiente para el producto ${product.name}`, { extensions: { code: 'BAD_USER_INPUT' } });
            }

            const subtotal = Number(product.price) * item.quantity;
            total += subtotal;

            await OrderItem.create({
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              price: product.price,
              subtotal
            }, { transaction });

            // Actualizar stock del producto
            await product.update({
              stock: product.stock - item.quantity
            }, { transaction });
          }

          // Actualizar el total de la orden
          await order.update({ total }, { transaction });

          await transaction.commit();
          return order;

        } catch (error) {
          await transaction.rollback();
          throw error;
        }

      } catch (error) {
        console.error('Error creando orden:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    updateOrderStatus: async (_: any, { id, status }: { id: string, status: 'pending' | 'processing' | 'completed' | 'cancelled' }, context: Context) => {
      try {
        const { user } = context;
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        // Solo admin puede actualizar status de órdenes
        if (user.role.toLowerCase() !== 'admin') {
          throw new GraphQLError('No tienes permisos para actualizar el estado de órdenes', { extensions: { code: 'FORBIDDEN' } });
        }

        const order = await Order.findByPk(id);
        if (!order) {
          throw new GraphQLError('Orden no encontrada', { extensions: { code: 'NOT_FOUND' } });
        }

        await order.update({ status });
        return order;
      } catch (error) {
        console.error('Error actualizando status de orden:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },

    cancelOrder: async (_: any, { id }: { id: string }, context: Context) => {
      try {
        const { user } = context;
        if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        
        const order = await Order.findByPk(id);
        if (!order) throw new GraphQLError('Orden no encontrada', { extensions: { code: 'NOT_FOUND' } });
        
        // Verificar que el usuario sea el propietario de la orden o un administrador
        if (user.role.toLowerCase() !== 'admin') {
          isOwner(context, order.userId);
        }
        
        if (order.status !== 'pending') {
          throw new GraphQLError('Solo se pueden cancelar órdenes en estado pendiente', { extensions: { code: 'BAD_USER_INPUT' } });
        }
        
        await order.update({ status: 'cancelled' });
        return order;
      } catch (error) {
        console.error('Error cancelando orden:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },
  },

  Product: {
    category: async (product: any) => {
      // Si ya tenemos la información de la categoría cargada, usar esa
      if (product.categoryInfo) {
        return product.categoryInfo.name;
      }
      // Si no, hacer una consulta para obtener la categoría
      const category = await Category.findByPk(product.categoryId);
      return category ? category.name : product.category || 'General';
    },
    __resolveReference: async (reference: { id: string }) => {
      return Product.findByPk(reference.id);
    },
  },

  Order: {
    items: async (order: Order) => {
      try {
        const orderItems = await OrderItem.findAll({
          where: { orderId: order.id },
          include: [{ 
            model: Product,
            as: 'product'
          }]
        });
        return orderItems;
      } catch (error) {
        console.error('Error obteniendo items de orden:', error);
        throw new GraphQLError('Error interno del servidor. Por favor, inténtelo de nuevo más tarde.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
    },
  },
};
