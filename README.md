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
- **mainImageUrl**: URL de la imagen principal del producto
- **imageUrls**: Lista de URLs de imágenes adicionales del producto
- **categoryId**: Referencia a la categoría
- **createdAt**: Fecha de creación
- **updatedAt**: Fecha de última actualización

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

- **products**: Obtiene todos los productos con opciones de paginación y ordenamiento
  - **categoryId**: Filtro opcional por categoría
  - **limit**: Número máximo de resultados (por defecto: 10)
  - **offset**: Número de resultados a omitir para paginación
  - **sortBy**: Campo por el cual ordenar (por defecto: "name")
  - **sortOrder**: Dirección de ordenamiento (ASC o DESC)
- **product**: Obtiene un producto por su ID
- **categories**: Obtiene todas las categorías
- **category**: Obtiene una categoría por su ID
- **orders**: Obtiene las órdenes del usuario autenticado (requiere autenticación)
- **order**: Obtiene una orden específica por su ID (requiere autenticación)

### Mutations

- **createProduct**: Crea un nuevo producto con validación de datos (requiere rol SELLER o ADMIN)
  - Valida que el precio sea mayor que cero
  - Valida que el stock no sea negativo
  - Verifica que la categoría exista
  - Permite múltiples imágenes para cada producto
- **updateProduct**: Actualiza un producto existente con validación de datos (requiere rol SELLER o ADMIN)
  - Valida que el precio sea mayor que cero
  - Valida que el stock no sea negativo
  - Verifica que la categoría exista
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
- **SELLER**: Puede crear, actualizar y eliminar productos
- **ADMIN**: Tiene acceso completo a todas las funcionalidades, incluyendo la gestión de categorías y órdenes

## Integración con API Gateway

Este microservicio está diseñado para funcionar con un API Gateway, que enruta las solicitudes apropiadas a este servicio en función de las rutas configuradas. El Gateway también se encarga de la autenticación inicial y pasa el token JWT al microservicio para su validación.

### Implementación de la Integración

#### Federación de Esquemas GraphQL

Este microservicio expone su esquema GraphQL para ser federado por el API Gateway utilizando Apollo Federation. Esto permite:

- **Composición de esquemas**: El Gateway combina los esquemas de múltiples servicios en un único esquema unificado.
- **Resolución distribuida**: Las consultas que abarcan múltiples servicios son divididas y enrutadas adecuadamente.
- **Referencias entre servicios**: Los tipos pueden hacer referencia a entidades definidas en otros servicios.

Para habilitar la federación, el esquema GraphQL incluye directivas especiales como `@key` para identificar entidades y `@external` para referenciar campos de otros servicios.

#### Configuración en el Servicio

```typescript
// Ejemplo de configuración en schema.ts
const typeDefs = gql`
  extend type User @key(fields: "id") {
    id: ID! @external
    orders: [Order]
  }
  // resto del esquema...
`;
```

#### Enrutamiento de Solicitudes

El API Gateway enruta las solicitudes a este microservicio basándose en:

1. **Rutas predefinidas**: Todas las solicitudes a `/graphql/products` o `/graphql/orders` son dirigidas a este servicio.
2. **Resolución de consultas**: Para consultas federadas, el Gateway determina qué partes de la consulta corresponden a este servicio.
3. **Balanceo de carga**: El Gateway distribuye las solicitudes entre múltiples instancias del servicio cuando están disponibles.

### Manejo de Autenticación y Autorización

El flujo de autenticación entre el API Gateway y este microservicio funciona de la siguiente manera:

1. El cliente envía una solicitud al API Gateway con un token JWT en el encabezado `Authorization`.
2. El Gateway valida inicialmente el token y, si es válido, lo pasa a este microservicio en el encabezado de la solicitud.
3. Este microservicio extrae el token del encabezado, lo decodifica y obtiene la información del usuario y sus roles.
4. Basándose en los roles del usuario, el servicio determina si tiene permiso para realizar la operación solicitada.

#### Configuración de Variables de Entorno

Para la integración con el API Gateway, este microservicio requiere las siguientes variables de entorno adicionales:

```
GATEWAY_URL=http://api-gateway:4000
SERVICE_NAME=products-orders
SERVICE_PORT=4002
```

### Despliegue y Escalabilidad

Este microservicio está diseñado para ser escalable horizontalmente. Cuando se despliegan múltiples instancias:

1. El API Gateway descubre automáticamente las instancias disponibles.
2. Las solicitudes se distribuyen entre las instancias utilizando un algoritmo de balanceo de carga.
3. Las sesiones persistentes se mantienen mediante sticky sessions cuando es necesario.

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