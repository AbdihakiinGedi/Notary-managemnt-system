# Database Setup

## 1. Install Dependencies
Make sure you have installed the required Node.js packages:
```bash
npm install
```

## 2. Environment Variables
Create a `.env` file in the root of the `backend` directory and set your PostgreSQL connection string:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/sndnprs
```

## 3. Run Setup Script
Execute the following script to create the complete database schema and seed the initial users:
```bash
node backend/database/setupDb.js
```

## 4. Start Server
Start the backend development server:
```bash
npm run dev
```

The database should now be fully created, and you should be able to log in using the pre-seeded user accounts.