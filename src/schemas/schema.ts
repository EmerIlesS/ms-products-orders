import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    description: String!
    price: Float!
    originalPrice: Float
    discount: Int
    image: String!
    images: [String!]!
    category: String!
    categoryId: ID!
    stock: Int!
    rating: Float
    reviews: Int
    featured: Boolean
    active: Boolean
    createdAt: String
    updatedAt: String
  }

  type ProductsResponse {
    products: [Product!]!
    total: Int!
    page: Int!
    totalPages: Int!
    hasMore: Boolean!
  }

  type Category {
    id: ID!
    name: String!
    description: String!
    icon: String
    image: String
    productsCount: Int!
    active: Boolean!
    createdAt: String
    updatedAt: String
  }

  type Order {
    id: ID!
    userId: ID!
    status: OrderStatus!
    total: Float!
    items: [OrderItem!]!
    createdAt: String!
    updatedAt: String!
  }

  type OrderItem {
    product: Product!
    quantity: Int!
    price: Float!
    subtotal: Float!
  }

  enum OrderStatus {
    pending
    processing
    completed
    cancelled
  }

  input ProductFiltersInput {
    category: String
    categoryId: ID
    search: String
    minPrice: Float
    maxPrice: Float
    featured: Boolean
    active: Boolean
    inStock: Boolean
    page: Int = 1
    limit: Int = 10
    sortBy: String = "createdAt"
    sortOrder: SortOrder = DESC
  }

  input CreateProductInput {
    name: String!
    description: String!
    price: Float!
    originalPrice: Float
    image: String!
    images: [String!]
    categoryId: ID!
    stock: Int!
    featured: Boolean = false
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    originalPrice: Float
    image: String
    images: [String!]
    categoryId: ID
    stock: Int
    featured: Boolean
    active: Boolean
  }

  input CreateCategoryInput {
    name: String!
    description: String!
  }

  input CreateOrderInput {
    items: [OrderItemInput!]!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  type Query {
    products(filters: ProductFiltersInput): ProductsResponse!
    product(id: ID!): Product
    featuredProducts(limit: Int = 8): [Product!]!
    categories: [Category!]!
    category(id: ID!): Category
    orders(status: OrderStatus): [Order!]!
    order(id: ID!): Order
  }

  enum SortOrder {
    ASC
    DESC
  }

  type Mutation {
    # Product mutations
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!

    # Category mutations
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(id: ID!, input: CreateCategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!

    # Order mutations
    createOrder(input: CreateOrderInput!): Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
    cancelOrder(id: ID!): Order!
  }
`;
