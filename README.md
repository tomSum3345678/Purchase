# Installation Guide for this Project

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
  2. Navigate to **Settings** > **API**.
  3. Copy the **URL** (e.g., `https://your-project-id.supabase.co`) and the **anon key** (a long string under API keys).

- **Configure** `supabaseClient.js`:

  1. In the project directory, locate the file `supabase/supabaseClient.js` (or create it if it doesn’t exist).

  2. Open the file in your code editor and update it with your Supabase URL and anon key. It should look like this:

     ```
     import { createClient } from '@supabase/supabase-js';
     
     const supabaseUrl = 'https://your-project-id.supabase.co'; // Replace with your Supabase URL
     const supabaseAnonKey = 'your-anon-key'; // Replace with your anon key
     
     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
     ```

  3. Save the file.

### 4. Set Up the Database Schema

Apply the database schema to your Supabase project to create the necessary tables, indexes, functions, triggers, and enable real-time features.

- **Access SQL Editor**:

  1. In your Supabase dashboard, go to **SQL Editor**.
  2. Copy and paste the following SQL script into the SQL Editor and click **Run** to set up the database.

- **Database Schema and Setup**:

  ```sql
  -- Create Users Table
  CREATE TABLE public.users (
      user_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- Create Categories Table
  CREATE TABLE public.categories (
      category_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      category_name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- Create User Preferences Table
  CREATE TABLE public.user_preferences (
      preference_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      category_id bigint NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE CASCADE,
      CONSTRAINT unique_user_category UNIQUE (user_id, category_id)
  );

  -- Index for faster queries on user_preferences
  CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
  CREATE INDEX idx_user_preferences_category_id ON public.user_preferences(category_id);

  -- Function to limit user preferences to 3
  CREATE OR REPLACE FUNCTION public.limit_user_preferences()
  RETURNS TRIGGER AS $$
  BEGIN
      IF (
          SELECT COUNT(*)
          FROM public.user_preferences
          WHERE user_id = NEW.user_id
      ) >= 3 THEN
          RAISE EXCEPTION 'User % cannot have more than 3 preferences.', NEW.user_id;
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Trigger to enforce max 3 preferences
  CREATE TRIGGER trigger_limit_user_preferences
      BEFORE INSERT ON public.user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION public.limit_user_preferences();

  -- Create Products Table with Image Data
  CREATE TABLE public.products (
      product_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      product_name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL,
      category_id bigint,
      image_data TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
  );

  -- Create View History Table
  CREATE TABLE public.view_history (
      view_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      product_id bigint NOT NULL,
      viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE,
      CONSTRAINT unique_user_product_view UNIQUE (user_id, product_id)
  );

  -- Indexes for faster queries on view_history
  CREATE INDEX idx_view_history_user_id ON public.view_history(user_id);
  CREATE INDEX idx_view_history_product_id ON public.view_history(product_id);
  CREATE INDEX idx_view_history_viewed_at ON public.view_history(viewed_at);

  -- Create Shopping Cart Table
  CREATE TABLE public.shopping_cart (
      id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id bigint REFERENCES public.users(user_id) ON DELETE CASCADE,
      product_id bigint REFERENCES public.products(product_id) ON DELETE CASCADE, 
      quantity INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Indexes for faster queries on shopping_cart
  CREATE INDEX idx_shopping_cart_user_id ON public.shopping_cart(user_id);
  CREATE INDEX idx_shopping_cart_product_id ON public.shopping_cart(product_id);

  -- Create Orders Table
  CREATE TABLE public.orders (
      order_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      total_amount DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending', -- four status: pending, shipped, completed, cancelled
      delivery_address_line1 TEXT NOT NULL,
      delivery_address_line2 TEXT,
      delivery_street TEXT NOT NULL,
      delivery_district TEXT NOT NULL,
      delivery_country TEXT NOT NULL DEFAULT 'Hong Kong',
      delivery_status_current_location TEXT DEFAULT NULL,
      payment_status TEXT DEFAULT NULL, -- three status: null, pending_review, paid
      payment_method TEXT, -- two methods: 'PayMe', 'WeChat'
      payment_proof_image TEXT DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES public.users(user_id)
  );

  -- Create Order Items Table
  CREATE TABLE public.order_items (
      order_item_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      order_id bigint NOT NULL,
      product_id bigint NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
      FOREIGN KEY (product_id) REFERENCES public.products(product_id)
  );

  -- Create Order Messages Table
  CREATE TABLE public.order_messages (
      message_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      order_id bigint NOT NULL,
      user_id bigint NOT NULL,
      message_text TEXT NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      is_sales BOOLEAN NOT NULL DEFAULT FALSE, -- True for sales, false for customer
      FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
      FOREIGN KEY (user_id) REFERENCES public.users(user_id)
  );

  -- Index for faster queries on order_messages
  CREATE INDEX idx_order_messages_order_id ON public.order_messages(order_id);
  CREATE INDEX idx_order_messages_user_id ON public.order_messages(user_id);

  -- Create Comments Table
  CREATE TABLE public.comments (
      comment_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      product_id bigint NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment_text TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES public.users(user_id),
      FOREIGN KEY (product_id) REFERENCES public.products(product_id),
      CONSTRAINT unique_user_product_comment UNIQUE (user_id, product_id)
  );

  -- Trigger Function to Check Purchase Before Comment
  CREATE OR REPLACE FUNCTION public.check_purchase_before_comment()
  RETURNS TRIGGER AS $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1
          FROM public.order_items oi
          JOIN public.orders o ON oi.order_id = o.order_id
          WHERE o.user_id = NEW.user_id
          AND oi.product_id = NEW.product_id
          AND o.status = 'completed'
      ) THEN
          RAISE EXCEPTION 'User % has not purchased product % with completed order and cannot leave a comment.', NEW.user_id, NEW.product_id;
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Create Trigger for Comments Table
  CREATE TRIGGER trigger_check_purchase_before_comment
      BEFORE INSERT ON public.comments
      FOR EACH ROW
      EXECUTE FUNCTION public.check_purchase_before_comment();

  -- Function to Check if User Has Purchased a Product
  CREATE OR REPLACE FUNCTION public.has_purchased_product(p_user_id bigint, p_product_id bigint)
  RETURNS BOOLEAN AS $$
  BEGIN
      RETURN EXISTS (
          SELECT 1
          FROM public.order_items oi
          JOIN public.orders o ON oi.order_id = o.order_id
          WHERE o.user_id = p_user_id
          AND oi.product_id = p_product_id
          AND o.status = 'completed'
      );
  END;
  $$ LANGUAGE plpgsql;

  -- Decrement Stock Function
  CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id bigint, amount INTEGER)
  RETURNS VOID AS $$
  BEGIN
      UPDATE products
      SET stock = stock - amount
      WHERE product_id = p_product_id AND stock >= amount;
      IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient stock for product_id %', p_product_id;
      END IF;
  END;
  $$ LANGUAGE plpgsql;

  -- Insert Categories
  INSERT INTO public.categories (category_name) VALUES
  ('Mouhaap'),
  ('Cooking'),
  ('Programming'),
  ('History'),
  ('Autobiography');

  -- Insert Example Users (Admin and Regular Users)
  INSERT INTO public.users (username, email, password, role) VALUES
  ('admin_user', 'admin@example.com', 'securepassword', 'admin'),
  ('user', 'user@example.com', 'password', 'user'),
  ('tom3345678', 'tomsum@gmail.com', 'password', 'user');

  -- Note: Product insertions are commented out in the schema as they are examples.
  -- You can insert products manually in Supabase with appropriate image_data (e.g., base64 or URLs).

  -- Insert Items into Shopping Cart for Regular User (user_id 2)
  INSERT INTO public.shopping_cart (user_id, product_id, quantity) VALUES
  (2, 1, 1),  -- Assuming product_id 1 exists
  (2, 2, 1),  -- Assuming product_id 2 exists
  (2, 3, 1);  -- Assuming product_id 3 exists

  -- Note: The above insertions assume products with IDs 1, 2, and 3 exist. Insert products first if needed.

  -- Enable Real-Time for Tables
  ALTER PUBLICATION supabase_realtime ADD TABLE shopping_cart;
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
  ALTER PUBLICATION supabase_realtime ADD TABLE categories;
  ALTER PUBLICATION supabase_realtime ADD TABLE users;
  ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE view_history;
  ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
  ```

- **Verify Tables**:

  1. After running the SQL script, go to **Table Editor** in Supabase.
  2. You should see the tables (`users`, `categories`, `products`, etc.) listed.
  3. Verify that the sample data (categories, users, shopping cart items) is present.
  4. If the shopping cart insertions fail due to missing products, insert some test products first:

     ```sql
     INSERT INTO public.products (product_name, description, price, stock, category_id, image_data)
     VALUES 
     ('资治通鉴-精装全6册汇评精注本', 'A classic Chinese history book', 99.99, 50, 4, 'https://via.placeholder.com/150'),
     ('射雕英雄传（全四册）', 'A famous martial arts novel', 49.99, 30, 1, 'https://via.placeholder.com/150'),
     ('Java官方编程手册(全2册)', 'Official Java programming guide', 79.99, 20, 3, 'https://via.placeholder.com/150');
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

     ```
     import { createClient } from '@supabase/supabase-js';
     import 'dotenv/config';
     
     const supabaseUrl = process.env.SUPABASE_URL;
     const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
     
     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
     ```

- **Testing on Multiple Devices**: If testing on multiple devices, ensure all devices are on the same Wi-Fi network as your computer running the Expo server.

- **Supabase Policies**: By default, Supabase tables may not allow public access. If you encounter permission errors, go to **Authentication** > **Policies** in Supabase and create policies to allow read/write access for authenticated users, or temporarily enable public access for testing:

  ```
  -- Example policy to allow public read access to products
  CREATE POLICY "Allow public read access on products" ON products
  FOR SELECT USING (true);
  ```

- **Sample Data**: If you want to test with more data, add more entries to the `products` table in Supabase to populate the app with books.

---

## Next Steps

After setting up the project, you can start exploring the app’s features locally. Use the Expo Go app or an emulator to test user registration, product browsing, checkout, and chat functionalities.

If you have any issues, refer to the troubleshooting section or check the official documentation for Expo, React Native, and Supabase.
