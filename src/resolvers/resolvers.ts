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
      if (user.role.toLowerCase() !== 'admin' && user.role.toLowerCase() !== 'seller') {
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
      if (user.role.toLowerCase() !== 'admin') {
        isOwner(context, order.userId);
      }
      return order;
    },
  },

  Mutation: {    createProduct: async (_: any, { input }: { input: ProductInput }, { user }: Context) => {
      if (!user || (user.role.toLowerCase() !== 'admin' && user.role.toLowerCase() !== 'seller')) {
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
    },    updateProduct: async (_: any, { id, input }: { id: string, input: ProductInput }, { user }: Context) => {
      if (!user || (user.role.toLowerCase() !== 'admin' && user.role.toLowerCase() !== 'seller')) {
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
    },    deleteProduct: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user || (user.role.toLowerCase() !== 'admin' && user.role.toLowerCase() !== 'seller')) {
        throw new GraphQLError('Solo administradores y vendedores pueden eliminar productos', { extensions: { code: 'FORBIDDEN' } });
      }
      
      const product = await Product.findByPk(id);
      if (!product) throw new GraphQLError('Producto no encontrado', { extensions: { code: 'NOT_FOUND' } });
      
      await product.destroy();
      return true;
    },    createCategory: async (_: any, { input }: { input: CategoryInput }, { user }: Context) => {
      if (!user || user.role.toLowerCase() !== 'admin') {

      console.log('🔍 DEBUG createCategory - Usuario recibido:', user);
      console.log('🔍 DEBUG createCategory - Rol original:', user?.role);
      console.log('🔍 DEBUG createCategory - Rol normalizado:', user?.role?.toLowerCase());
      
     
        throw new GraphQLError('Only admins can create categories', { extensions: { code: 'FORBIDDEN' } });
      }
        
        
      
      console.log('✅ DEBUG createCategory - Acceso permitido, creando categoría:', input);
      return Category.create(input);
    },    deleteCategory: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user || user.role.toLowerCase() !== 'admin') {
        throw new GraphQLError('Only admins can delete categories', { extensions: { code: 'FORBIDDEN' } });
      }
      const category = await Category.findByPk(id);
      if (!category) throw new Error('Category not found');
      await category.destroy();
      return true;
    },    updateCategory: async (_: any, { id, input }: { id: string, input: CategoryInput }, { user }: Context) => {
      if (!user || user.role.toLowerCase() !== 'admin') {
        throw new GraphQLError('Solo administradores pueden actualizar categorías', { extensions: { code: 'FORBIDDEN' } });
      }
      
      const category = await Category.findByPk(id);
      if (!category) throw new GraphQLError('Categoría no encontrada', { extensions: { code: 'NOT_FOUND' } });
      
      await category.update(input);
      return category;
    },    createOrder: async (_: any, { input }: { input: OrderInput }, { user }: Context) => {
      if (!user) throw new GraphQLError('No autenticado', { extensions: { code: 'UNAUTHENTICATED' } });
        // Verificar que el usuario tenga el rol de cliente
      if (user.role.toLowerCase() !== 'customer') {
        throw new GraphQLError('Solo los clientes pueden crear órdenes', { extensions: { code: 'FORBIDDEN' } });
      }
      
      // Validar que el pedido tenga al menos un elemento
      if (!input.items || input.items.length === 0) {
        throw new GraphQLError('La orden debe contener al menos un producto', { 
          extensions: { code: 'BAD_USER_INPUT' } 
        });
      }
      
      // Validar que no haya IDs de productos duplicados
      const productIds = input.items.map(item => item.productId);
      const uniqueProductIds = new Set(productIds);
      if (productIds.length !== uniqueProductIds.size) {
        throw new GraphQLError(
          'La orden contiene productos duplicados. Por favor, consolide las cantidades.', 
          { extensions: { code: 'BAD_USER_INPUT' } }
        );
      }

      const transaction = await sequelize.transaction();

      try {
        // Verificar disponibilidad de productos primero
        const productChecks = await Promise.all(
          input.items.map(async (item) => {
            const product = await Product.findByPk(item.productId);
            if (!product) {
              throw new GraphQLError(`Producto no encontrado: ${item.productId}`, { 
                extensions: { code: 'NOT_FOUND' } 
              });
            }
            
            if (product.stock < item.quantity) {
              throw new GraphQLError(
                `Stock insuficiente para el producto ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`, 
                { extensions: { code: 'BAD_USER_INPUT' } }
              );
            }
            
            if (item.quantity <= 0) {
              throw new GraphQLError(
                `La cantidad del producto ${product.name} debe ser mayor que cero`, 
                { extensions: { code: 'BAD_USER_INPUT' } }
              );
            }
            
            return { product, quantity: item.quantity };
          })
        );

        // Crear el pedido
        const order = await Order.create(
          {
            userId: user.id,
            status: 'pending',
            total: 0,
          },
          { transaction }
        );

        let total = 0;
        let orderItems = [];

        // Procesar cada elemento del pedido
        for (const { product, quantity } of productChecks) {
          // Crear el elemento de la orden
          const orderItem = await OrderItem.create(
            {
              orderId: order.id,
              productId: product.id,
              quantity: quantity,
              price: parseFloat(product.price.toString()), // Asegurar que sea un número
              subtotal: parseFloat(product.price.toString()) * quantity,
            },
            { transaction }
          );
          
          orderItems.push(orderItem);

          // Actualizar el stock del producto
          await product.update(
            {
              stock: product.stock - quantity,
            },
            { transaction }
          );

          // Acumular el total
          total += parseFloat(product.price.toString()) * quantity;
        }

        // Actualizar el total del pedido redondeando a 2 decimales
        await order.update({ 
          total: Math.round(total * 100) / 100
        }, { transaction });

        // Confirmar la transacción
        await transaction.commit();
        
        console.log(`Orden ${order.id} creada correctamente para el usuario ${user.id}`);
        return order;
      } catch (error) {
        // Rollback en caso de error
        await transaction.rollback();
        
        // Registrar el error para depuración
        console.error('Error al crear orden:', error);
        
        // Reenviar el error con un formato adecuado para GraphQL
        if (error instanceof GraphQLError) {
          throw error;
        } else {
          throw new GraphQLError(
            `Error al procesar la orden: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            { extensions: { code: 'INTERNAL_SERVER_ERROR' } }
          );
        }
      }
    },    updateOrderStatus: async (_: any, { id, status }: { id: string, status: 'pending' | 'processing' | 'completed' | 'cancelled' }, { user }: Context) => {
      if (!user || (user.role.toLowerCase() !== 'admin' && user.role.toLowerCase() !== 'seller')) {
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
      try {
        const orderItems = await OrderItem.findAll({
          where: { orderId: order.id },
          include: [{ 
            model: Product, 
            as: 'product',
            // Incluir la categoría del producto
            include: [{ model: Category, as: 'category' }] 
          }],
        });
        
        // Si no hay elementos, devolver un array vacío en lugar de null
        return orderItems || [];
      } catch (error) {
        console.error(`Error al obtener los elementos de la orden ${order.id}:`, error);
        // Devolver un array vacío para evitar errores null en el cliente
        return [];
      }
    },
  },
};
