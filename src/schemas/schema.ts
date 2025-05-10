import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    description: String!
    price: Float!
    stock: Int!
    mainImageUrl: String!
    imageUrls: [String!]!
    category: Category!
    createdAt: String
    updatedAt: String
  }

  type Category {
    id: ID!
    name: String!
    description: String!
    products: [Product!]!
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

  input CreateProductInput {
    name: String!
    description: String!
    price: Float!
    stock: Int!
    mainImageUrl: String!
    imageUrls: [String!]
    categoryId: ID!
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    stock: Int
    mainImageUrl: String
    imageUrls: [String!]
    categoryId: ID
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
    products(
      categoryId: ID
      searchName: String
      minPrice: Float
      maxPrice: Float
      limit: Int = 10
      offset: Int = 0
      sortBy: String = "name"
      sortOrder: SortOrder = ASC
    ): [Product!]!
    product(id: ID!): Product
    categories: [Category!]!
    category(id: ID!): Category
    orders: [Order!]!
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
  }
`;
