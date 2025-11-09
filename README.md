# Inventory and Procurement Management System (IPMS)

A comprehensive full-stack web application for managing inventory, procurement, and transactions across multiple locations.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [User Roles](#user-roles)
- [Core Modules](#core-modules)
- [Transaction Workflow](#transaction-workflow)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Dashboard
- **Real-time Analytics**: View total products, out-of-stock items, inventory value, and total sales
- **Top Saleable Items**: Bar chart showing best-selling products (approved sales only)
- **Low Inventory Alerts**: Configurable threshold for low-stock warnings
- **Responsive Design**: Mobile-friendly interface with smooth animations

### Inventory Management
- **Product CRUD**: Create, read, update, and delete products
- **Multi-location Support**: Track products across different locations
- **Stock Tracking**: Real-time stock levels with pending adjustments
- **CSV Import/Export**: Bulk import/export products with auto-create locations and categories
- **Advanced Filtering**: Search by item code, name, location, and category

### Procurement
- **Purchase Orders**: Create and manage purchase orders with auto-generated PO numbers
- **Supplier Management**: Track companies with contact details and payment terms
- **Approval Workflow**: Draft → Pending → Approved/Rejected
- **Linked Inbound**: Auto-create inbound transactions when PO is approved
- **Product Auto-creation**: Automatically create product instances in target locations

### Transaction Management
- **Multiple Transaction Types**:
  - **Sale**: Sell products from a location
  - **Purchase**: Order products from suppliers
  - **Inbound**: Receive products into a location
  - **Outbound**: Remove products from a location
  - **Transfer**: Move products between locations
- **Status Tracking**: Draft, Pending, Approved, Rejected, Cancelled
- **Pending Stock Calculation**: Shows available stock considering pending transactions
- **Location-based Filtering**: Filter products by source/target location

### Data Management
- **Products**: Manage product catalog with pricing and descriptions
- **Companies**: Supplier/customer database
- **Locations**: Warehouse/store locations
- **Categories**: Product categorization
- **Users**: User management with role-based access

### User Management
- **Role-based Access Control**: Admin and Viewer roles
- **Profile Management**: Update user details and passwords
- **Location Assignment**: Assign users to specific locations
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js v5.1.0
- **Database**: MongoDB with Mongoose ODM v8.19.3
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt v6.0.0
- **File Upload**: Multer
- **CSV Parsing**: csv-parser
- **Module System**: ES Modules

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS v4
- **HTTP Client**: Axios
- **Icons**: react-icons/fa
- **Charts**: Recharts
- **Animation**: Framer Motion
- **State Management**: React Context API

## 📦 Prerequisites

- **Node.js**: v18 or higher
- **MongoDB**: v6 or higher (local or cloud instance)
- **npm** or **yarn**: Package manager

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ipms
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## 🔐 Environment Variables

### Backend (.env)

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ipms
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ipms

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)

Create a `.env` file in the `frontend` directory:

```env
# API Base URL
VITE_API_URL=http://localhost:3000
```

## ▶️ Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

### Production Build

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## 👥 User Roles

### Admin
- Full access to all features
- Can approve/reject transactions
- Can manage users
- Can access all locations
- Can view cost prices and profit margins

### Viewer
- Read-only access to most features
- Can create and submit transactions
- Cannot approve/reject transactions
- Cannot manage users
- Limited to assigned location (if applicable)

### Default Admin Credentials

**Important**: Change these credentials after first login!

```
Email: admin@example.com
Password: admin123
```

## 📚 Core Modules

### 1. Products
- Unique by `itemCode + locationId`
- Track stock levels, cost price, and selling price
- Support for categories and descriptions
- CSV import/export with auto-create

### 2. Transactions
- **Sale**: Deducts stock from location when approved
- **Purchase**: Creates linked inbound transaction when approved
- **Inbound**: Adds stock to location when approved
- **Outbound**: Deducts stock from location when approved
- **Transfer**: Moves stock between locations, auto-creates product instances

### 3. Procurement
- Auto-generated PO numbers (format: `YYYY-00001`)
- Linked to inbound transactions
- Supplier management with payment terms
- Delivery tracking

### 4. Approvals
- Centralized approval dashboard
- Approve/reject/cancel transactions
- View transaction details and history
- Admin-only access

## 🔄 Transaction Workflow

### Purchase Order Flow
1. **Create Purchase Order** (Draft/Pending)
2. **Submit for Approval** (Pending)
3. **Admin Approves** → Creates linked Inbound transaction + Product instances in target location (stock = 0)
4. **Receive Goods** → Update Inbound transaction with received quantities
5. **Approve Inbound** → Stock added to target location

### Transfer Flow
1. **Create Transfer** (Draft/Pending) → Auto-creates product instance in target location (stock = 0)
2. **Submit for Approval** (Pending)
3. **Admin Approves** → Stock deducted from source, added to target

### Sale Flow
1. **Create Sale** (Draft/Pending)
2. **Submit for Approval** (Pending)
3. **Admin Approves** → Stock deducted from location

## 📡 API Documentation

### Authentication
All API endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Products
- `GET /product` - Get all products
- `POST /product/add` - Create product
- `PATCH /product/:id` - Update product
- `DELETE /product/:id` - Delete product
- `GET /product/csv/export` - Export products to CSV
- `POST /product/csv/import` - Import products from CSV

#### Transactions
- `GET /transaction` - Get all transactions (supports `?type=sale` filter)
- `POST /transaction` - Create transaction
- `GET /transaction/:id` - Get transaction by ID
- `PUT /transaction/:id/approve` - Approve transaction (admin)
- `PUT /transaction/:id/reject` - Reject transaction (admin)
- `PUT /transaction/:id/cancel` - Cancel transaction (admin)
- `PUT /transaction/:id/inbound` - Update inbound quantities
- `PUT /transaction/:id/purchase` - Update purchase order

#### Users
- `POST /users/login` - Login
- `POST /users/register` - Register new user (admin)
- `GET /users` - Get all users
- `PATCH /users/:id` - Update user

#### Companies
- `GET /company` - Get all companies
- `POST /company/add` - Create company
- `PATCH /company/:id` - Update company
- `DELETE /company/:id` - Delete company

#### Locations
- `GET /location` - Get all locations
- `POST /location/add` - Create location
- `PATCH /location/:id` - Update location
- `DELETE /location/:id` - Delete location

#### Categories
- `GET /category` - Get all categories
- `POST /category/add` - Create category
- `PATCH /category/:id` - Update category
- `DELETE /category/:id` - Delete category

## 📁 Project Structure

```
ipms/
├── backend/
│   ├── controllers/       # Business logic
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── middleware/       # Auth & validation
│   ├── uploads/          # File uploads
│   └── server.js         # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Utility functions
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   └── public/           # Static assets
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Known Issues

- None at the moment

## 📞 Support

For support, please contact the development team or open an issue in the repository.

---

**Built with ❤️ using React, Node.js, and MongoDB**

