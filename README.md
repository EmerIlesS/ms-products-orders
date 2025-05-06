# Microservicio de Productos y Órdenes (ms-products-orders)

## Descripción

Este microservicio gestiona los productos, categorías y órdenes de compra para la plataforma de e-commerce. Proporciona una API GraphQL que permite la creación, consulta, actualización y eliminación de productos y categorías, así como la gestión completa del ciclo de vida de las órdenes de compra.

## Características

- Gestión completa de productos (CRUD)
- Gestión de categorías de productos
- Procesamiento de órdenes de compra
- API GraphQL
- Integración con el microservicio de autenticación
- Validación de roles de usuario para operaciones específicas

## Tecnologías Utilizadas

- **Node.js**: Entorno de ejecución para JavaScript
- **TypeScript**: Superset tipado de JavaScript
- **Apollo Server**: Servidor GraphQL
- **Sequelize**: ORM para bases de datos relacionales
- **PostgreSQL**: Base de datos relacional
- **JWT**: Autenticación basada en tokens

## Estructura del Proyecto

```
ms-products-orders/
├── src/
│   ├── config/
│   │   └── database.ts       # Configuración de la base de datos
│   ├── models/
│   │   ├── category.model.ts # Modelo de categorías
│   │   ├── order.model.ts    # Modelo de órdenes y items
│   │   └── product.model.ts  # Modelo de productos
│   ├── resolvers/
│   │   └── resolvers.ts      # Resolvers GraphQL
│   ├── schemas/
│   │   └── schema.ts         # Definición del esquema GraphQL
│   └── index.ts              # Punto de entrada de la aplicación
├── .env.example              # Ejemplo de variables de entorno
├── .gitignore                # Archivos ignorados por git
├── Dockerfile                # Configuración para Docker
├── package.json              # Dependencias y scripts
└── tsconfig.json             # Configuración de TypeScript
```

## Modelos de Datos

### Producto

- **id**: Identificador único (UUID)
- **name**: Nombre del producto
- **description**: Descripción detallada
- **price**: Precio
- **stock**: Cantidad disponible
- **imageUrl**: URL de la imagen del producto
- **categoryId**: Referencia a la categoría

### Categoría

- **id**: Identificador único (UUID)
- **name**: Nombre de la categoría
- **description**: Descripción de la categoría

### Orden

- **id**: Identificador único (UUID)
- **userId**: ID del usuario que realizó la orden
- **status**: Estado de la orden (pending, processing, completed, cancelled)
- **total**: Monto total de la orden
- **items**: Lista de productos en la orden

### Item de Orden

- **orderId**: ID de la orden
- **productId**: ID del producto
- **quantity**: Cantidad del producto
- **price**: Precio unitario al momento de la compra
- **subtotal**: Subtotal (precio × cantidad)

## Instalación y Configuración

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Copiar el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
4. Configurar las variables de entorno en el archivo `.env`:
   ```
   PORT=4002
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=products_orders_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   ```
5. Iniciar el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```

## API GraphQL

### Queries

- **products**: Obtiene todos los productos (opcionalmente filtrados por categoría)
- **product**: Obtiene un producto por su ID
- **categories**: Obtiene todas las categorías
- **category**: Obtiene una categoría por su ID
- **orders**: Obtiene las órdenes del usuario autenticado (requiere autenticación)
- **order**: Obtiene una orden específica por su ID (requiere autenticación)

### Mutations

- **createProduct**: Crea un nuevo producto (requiere rol SELLER o ADMIN)
- **updateProduct**: Actualiza un producto existente (requiere rol SELLER o ADMIN)
- **deleteProduct**: Elimina un producto (requiere rol SELLER o ADMIN)
- **createCategory**: Crea una nueva categoría (requiere rol ADMIN)
- **updateCategory**: Actualiza una categoría existente (requiere rol ADMIN)
- **deleteCategory**: Elimina una categoría (requiere rol ADMIN)
- **createOrder**: Crea una nueva orden de compra (requiere autenticación)
- **updateOrderStatus**: Actualiza el estado de una orden (requiere rol ADMIN)

## Integración con el Microservicio de Autenticación

Este microservicio se integra con el microservicio de autenticación (ms-auth-java) para validar los tokens JWT y obtener información del usuario. La validación se realiza en cada solicitud que requiere autenticación, verificando el token proporcionado en el encabezado de autorización.

Los roles de usuario (CUSTOMER, SELLER, ADMIN) determinan los permisos para realizar ciertas operaciones:

- **CUSTOMER**: Puede ver productos y categorías, y crear órdenes
- **SELLER**: Puede gestionar sus propios productos
- **ADMIN**: Tiene acceso completo a todas las funcionalidades

## Integración con API Gateway

Este microservicio está diseñado para funcionar con un API Gateway, que enruta las solicitudes apropiadas a este servicio en función de las rutas configuradas. El Gateway también se encarga de la autenticación inicial y pasa el token JWT al microservicio para su validación.

## Ejemplos de Uso

### Consultar Productos

```graphql
query {
  products {
    id
    name
    description
    price
    stock
    imageUrl
    category {
      id
      name
    }
  }
}
```

### Crear un Producto

```graphql
mutation {
  createProduct(input: {
    name: "Smartphone XYZ",
    description: "El último modelo con características avanzadas",
    price: 599.99,
    stock: 50,
    imageUrl: "https://example.com/images/smartphone-xyz.jpg",
    categoryId: "category-uuid-here"
  }) {
    id
    name
    price
  }
}
```

### Crear una Orden

```graphql
mutation {
  createOrder(input: {
    items: [
      { productId: "product-uuid-1", quantity: 2 },
      { productId: "product-uuid-2", quantity: 1 }
    ]
  }) {
    id
    status
    total
    items {
      product {
        name
      }
      quantity
      price
      subtotal
    }
  }
}
```

## Desarrollo

```bash
# Compilar el proyecto
npm run build

# Iniciar en modo desarrollo con recarga automática
npm run dev

# Iniciar en modo producción
npm start

# Ejecutar pruebas
npm test
```

## Despliegue con Docker

1. Construir la imagen Docker:
   ```bash
   docker build -t ms-products-orders .
   ```

2. Ejecutar el contenedor:
   ```bash
   docker run -p 4002:4002 --env-file .env ms-products-orders
   ```

Alternativamente, puede utilizar Docker Compose para ejecutar este microservicio junto con los demás componentes del sistema.