# Installation Guide for SSW BookHub Project

This guide provides step-by-step instructions to set up and run the SSW BookHub e-book store project locally. The project is a React Native mobile app built with Expo and uses Supabase for backend services (database and storage). Follow these steps to get the app running on your local machine.

---

## Prerequisites

Before you begin, ensure you have the following installed and set up:

- **Node.js**: Version 16.x or later. Download and install from nodejs.org. To verify, run:

  ```
  node -v
  ```

  You should see a version number (e.g., `v16.20.0`).

- **npm**: Comes with Node.js. Verify with:

  ```
  npm -v
  ```

  You should see a version number (e.g., `8.19.4`).

- **Expo CLI**: Used to manage and run the React Native app. Install globally with:

  ```
  npm install -g expo-cli
  ```

  Verify with:

  ```
  expo --version
  ```

  You should see a version number (e.g., `6.0.8`).

- **Expo Go App**: Download the Expo Go app on your mobile device (iOS or Android) to test the app. Available on the App Store (iOS) or Google Play Store (Android).

- **Git**: To clone the repository. Download and install from git-scm.com. Verify with:

  ```
  git --version
  ```

  You should see a version number (e.g., `git version 2.39.2`).

- **Supabase Account**: Sign up for a free account at supabase.com. You’ll need this to set up the backend database and storage.

- **Code Editor**: A code editor like Visual Studio Code (VS Code) is recommended for editing project files.

- **Mobile Device or Emulator**:

  - For iOS: Install Xcode (macOS only) to run an iOS simulator.
  - For Android: Install Android Studio to set up an Android emulator, and ensure you have an Android Virtual Device (AVD) configured.
  - Alternatively, use the Expo Go app on your physical device for testing.

---

## Steps to Install and Run the Project

### 1. Clone the Repository

Clone the SSW BookHub project repository to your local machine using Git.

- Open a terminal (or command prompt) and run:

  ```
  git clone https://github.com/tomSum3345678/Purchase.git
  ```
- Navigate into the project directory:

  ```
  cd Purchase
  ```

### 2. Install Dependencies

Install the project’s dependencies listed in `package.json`.

- Run the following command in the project directory:

  ```
  npm install
  ```

- This will install all required packages, including:

  - `expo`: For React Native app development.
  - `@supabase/supabase-js`: For interacting with Supabase.
  - `@react-navigation/native` and `@react-navigation/stack`: For navigation.
  - `expo-image-picker`: For image uploads.
  - Other dependencies like `react`, `react-native`, and `react-native-safe-area-context`.

- If you encounter any errors, try clearing the npm cache and reinstalling:

  ```
  npm cache clean --force
  npm install
  ```

### 3. Configure Supabase

Set up the Supabase backend by configuring the client with your project’s API keys.

- **Create a Supabase Project**:

  1. Log in to your Supabase account at app.supabase.com.
  2. Click **New Project**, select your organization, and give your project a name (e.g., `ssw-bookhub`).
  3. Choose a region close to you and set a secure password for the database.
  4. Wait for the project to be created (this may take a minute).

- **Get Supabase API Keys**:

  1. Go to your project dashboard in Supabase.
  2. Navigate to **Settings** &gt; **API**.
  3. Copy the **URL** (e.g., `https://your-project-id.supabase.co`) and the **anon key** (a long string under API keys).

- **Configure** `supabaseClient.js`:

  1. In the project directory, locate the file `supabase/supabaseClient.js` (or create it if it doesn’t exist).
  2. Open the file in your code editor and update it with your Supabase URL and anon key. It should look like this:

     ```javascript
     import { createClient } from '@supabase/supabase-js';
     
     const supabaseUrl = 'https://your-project-id.supabase.co'; // Replace with your Supabase URL
     const supabaseAnonKey = 'your-anon-key'; // Replace with your anon key
     
     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
     ```
  3. Save the file.

### 4. Set Up the Database Schema

Apply the database schema to your Supabase project to create the necessary tables.

- **Access SQL Editor**:

  1. In your Supabase dashboard, go to **SQL Editor**.
  2. You’ll need to create tables for `users`, `products`, `orders`, `order_items`, `comments`, and `order_messages`. Below is the SQL schema to set up these tables. Copy and paste this into the SQL Editor and click **Run**.

- **Database Schema**:

  ```sql
  -- Users table (for storing user information)
  CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      profile_image TEXT,
      created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Products table (for storing book/product details)
  CREATE TABLE products (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL NOT NULL,
      stock INTEGER NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Orders table (for storing order information)
  CREATE TABLE orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, approved, shipped, delivered
      total_amount DECIMAL NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Order Items table (for storing items in each order)
  CREATE TABLE order_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID REFERENCES orders(id),
      product_id UUID REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price_at_purchase DECIMAL NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Comments table (for storing product comments/ratings)
  CREATE TABLE comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      product_id UUID REFERENCES products(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Order Messages table (for storing chat messages related to orders)
  CREATE TABLE order_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID REFERENCES orders(id),
      user_id UUID REFERENCES users(id),
      message TEXT NOT NULL,
      is_sales BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE for admin messages, FALSE for customer messages
      created_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Add indexes for faster queries
  CREATE INDEX idx_orders_user_id ON orders(user_id);
  CREATE INDEX idx_order_items_order_id ON order_items(order_id);
  CREATE INDEX idx_comments_product_id ON comments(product_id);
  CREATE INDEX idx_order_messages_order_id ON order_messages(order_id);
  ```

- **Verify Tables**:

  1. After running the SQL script, go to **Table Editor** in Supabase.
  2. You should see the tables (`users`, `products`, `orders`, etc.) listed.
  3. Optionally, insert some test data (e.g., a few products) to use while testing the app:

     ```sql
     INSERT INTO products (name, description, price, stock, image_url)
     VALUES ('Sample Book', 'A great e-book for testing', 9.99, 100, 'https://via.placeholder.com/150');
     ```

### 5. Install Expo Dependencies

The project uses Expo modules like `expo-image-picker`. Ensure these are properly configured.

- Run the following command to install Expo modules:

  ```
  npx expo install expo-image-picker
  ```
- If you encounter permission prompts (e.g., for camera or photo library access), follow the instructions in the Expo documentation to enable them in your app configuration.

### 6. Run the App Locally

Start the Expo development server and run the app on your device or emulator.

- Start the Expo server:

  ```
  npx expo start
  ```

  This will start the Metro bundler and display a QR code in the terminal.

- **Run on a Physical Device**:

  1. Open the Expo Go app on your mobile device.
  2. Scan the QR code displayed in the terminal.
  3. The app will load in Expo Go. If it doesn’t load, ensure your device and computer are on the same Wi-Fi network.

- **Run on an Emulator**:

  - For **Android**:
    1. Open Android Studio and start an Android Virtual Device (AVD).
    2. In the Expo terminal, press `a` to run the app on the Android emulator.
  - For **iOS** (macOS only):
    1. Open Xcode and start an iOS simulator.
    2. In the Expo terminal, press `i` to run the app on the iOS simulator.

- If you encounter errors (e.g., “Metro bundler failed”), try clearing the cache and restarting:

  ```
  npx expo start --clear
  ```

### 7. Test the App

Once the app is running, test the following features locally:

- **Register a User**: Use `RegisterForm.js` to create a new user account with an email, password, and profile image.
- **Browse Products**: Use `ProductDetail.js` to view products and add them to your cart.
- **Checkout**: Use `CheckoutConfirmation.js` and `PaymentScreen.js` to simulate a purchase.
- **Chat**: Use `OrderChat.js` to test real-time messaging for an order.
- **Admin Features**: Use `ProductInfo.js` to update products and `HandleOrder.js` to manage orders (you may need to manually set a user as an admin in Supabase).

---

## Troubleshooting

- **Error: “Cannot connect to Supabase”**

  - Double-check your `supabaseClient.js` file. Ensure the URL and anon key are correct.
  - Verify that your Supabase project is active and not paused (check in the Supabase dashboard).

- **Error: “Metro bundler failed to start”**

  - Ensure no other Metro bundler is running. Stop other Expo projects and try again.
  - Clear the cache: `npx expo start --clear`.

- **Error: “Image upload fails”**

  - Ensure you’ve granted camera/photo library permissions in Expo Go or your emulator.
  - Check that your Supabase Storage bucket is set up and accessible (go to **Storage** in Supabase).

- **Error: “Navigation not working”**

  - Verify that `@react-navigation` dependencies are installed correctly (`@react-navigation/native`, `@react-navigation/stack`).
  - Check `AppNavigator.js` for correct screen names and navigation setup.

---

## Additional Notes

- **Environment Variables**: If you prefer, you can store Supabase keys in a `.env` file to keep them secure:

  1. Install the `dotenv` package:

     ```
     npm install dotenv
     ```
  2. Create a `.env` file in the project root:

     ```
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_ANON_KEY=your-anon-key
     ```
  3. Update `supabaseClient.js` to use these variables:

     ```javascript
     import { createClient } from '@supabase/supabase-js';
     import 'dotenv/config';
     
     const supabaseUrl = process.env.SUPABASE_URL;
     const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
     
     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
     ```

- **Testing on Multiple Devices**: If testing on multiple devices, ensure all devices are on the same Wi-Fi network as your computer running the Expo server.

- **Supabase Policies**: By default, Supabase tables may not allow public access. If you encounter permission errors, go to **Authentication** &gt; **Policies** in Supabase and create policies to allow read/write access for authenticated users, or temporarily enable public access for testing:

  ```sql
  -- Example policy to allow public read access to products
  CREATE POLICY "Allow public read access on products" ON products
  FOR SELECT USING (true);
  ```

- **Sample Data**: If you want to test with more data, add more entries to the `products` table in Supabase to populate the app with books.

---

## Next Steps

After setting up the project, you can start exploring the app’s features locally. Use the Expo Go app or an emulator to test user registration, product browsing, checkout, and chat functionalities. Since this is a student project, focus on learning and experimenting with the code rather than deploying to production.

If you have any issues, refer to the troubleshooting section or check the official documentation for Expo, React Native, and Supabase.
