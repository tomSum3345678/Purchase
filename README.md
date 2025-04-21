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
  -- Create Users Table
CREATE TABLE public.users (
    user_id bigint primary key generated always as identity,
    username text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    role text NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create Categories Table
CREATE TABLE public.categories (
    category_id bigint primary key generated always as identity,
    category_name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create User Preferences Table
CREATE TABLE public.user_preferences (
    preference_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    category_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_category UNIQUE (user_id, category_id)
);

-- Index for faster queries
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
    product_id bigint primary key generated always as identity,
    product_name text NOT NULL,
    description text,
    price decimal(10,2) NOT NULL,
    stock int NOT NULL,
    category_id bigint,
    image_data text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
);

-- Create View History Table
CREATE TABLE public.view_history (
    view_id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    product_id bigint NOT NULL,
    viewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_product_view UNIQUE (user_id, product_id)
);

-- Indexes for faster queries
CREATE INDEX idx_view_history_user_id ON public.view_history(user_id);
CREATE INDEX idx_view_history_product_id ON public.view_history(product_id);
CREATE INDEX idx_view_history_viewed_at ON public.view_history(viewed_at);

-- Create Shopping Cart Table
CREATE TABLE public.shopping_cart (
    id bigint primary key generated always as identity,
    user_id bigint references public.users(user_id) on delete cascade,
    product_id bigint references public.products(product_id) on delete cascade, 
    quantity integer not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

CREATE INDEX idx_shopping_cart_user_id ON public.shopping_cart(user_id);
CREATE INDEX idx_shopping_cart_product_id ON public.shopping_cart(product_id);

-- Create Orders Table
CREATE TABLE public.orders (
    order_id bigint primary key generated always as identity,
    user_id bigint NOT NULL,
    order_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    total_amount decimal(10,2) NOT NULL,
    status text DEFAULT 'pending', --four status: pending, shipped, completed, cancelled
    delivery_address_line1 text NOT NULL,
    delivery_address_line2 text,
    delivery_street text NOT NULL,
    delivery_district text NOT NULL,
    delivery_country text NOT NULL DEFAULT 'Hong Kong',
    delivery_status_current_location text DEFAULT NULL,
    payment_status text DEFAULT NULL, -- three status: null, pending_review, paid
    payment_method text, -- two method: 'PayMe', 'WeChat'
    payment_proof_image text DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

-- Create Order Items Table
CREATE TABLE public.order_items (
    order_item_id bigint primary key generated always as identity,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity int NOT NULL,
    price decimal(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
    FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);

-- Create Order Messages Table
CREATE TABLE public.order_messages (
    message_id bigint primary key generated always as identity,
    order_id bigint NOT NULL,
    user_id bigint NOT NULL,
    message_text text NOT NULL,
    sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_sales boolean NOT NULL DEFAULT false, -- True for sales, false for customer
    FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
    FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

-- Index for faster queries
CREATE INDEX idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX idx_order_messages_user_id ON public.order_messages(user_id);

-- Create Comments Table
CREATE TABLE public.comments (
    comment_id bigint primary key generated always as identity,
    user_id bigint NOT NULL,
    product_id bigint NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment_text text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
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


CREATE OR REPLACE FUNCTION public.has_purchased_product(p_user_id bigint, p_product_id bigint)
RETURNS boolean AS $$
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
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id bigint, amount integer)--To safely decrement stock, create an RPC function
RETURNS void AS $$
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

-- Insert Products (with image data)
INSERT INTO public.products (product_name, description, price, stock, category_id, image_data, created_at) VALUES
('资治通鉴-精装全6册汇评精注本', '《资治通鉴》，简称《通鉴》，是中国著名古典编年史、北宋司马光所主编的长篇编年体史书，共294卷，三百万字。', 589.99, 15, 4, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//Zi_Zhi_Tong_Jian.jpg', NOW() - INTERVAL '2 hours'),
('射雕英雄传（全四册）（原作平装版）', '《射雕英雄传》是金庸的代表作之一，作于一九五七年到一九五九年。《射雕》中的人物个性单纯，郭靖诚朴厚重、黄蓉机智狡狯，读者容易印象深刻。', 59.99, 15, 1, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//Condor_Heroes.jpeg', NOW() - INTERVAL '1 day'),
('Java官方编程手册(全2册)', '第12版·Java 17', 120.00, 13, 3, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//java_book.jpg', NOW() - INTERVAL '3 hours'),
('Python Programming Book', '2023 Edition with exercises', 35.50, 8, 3, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image/py-book.jpg', NOW() - INTERVAL '5 days'),
('安妮日记 (70周年纪念典藏版)', '《安妮日记》是德籍犹太人安妮·弗兰克写的日记，当中记录1942年6月12日至1944年8月1日期间，安妮亲身经历第二次世界大战中德国占领荷兰的生活。', 92.99, 20, 5, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//Het_Achterhuis.jpg', NOW() - INTERVAL '1 hour'),
('希特拉: 我的奋斗', '《我的奋斗》系统地阐述了希特勒的理想，创建第三帝国和征服欧洲。全书充满了民族主义狂热和对马克思主义、民主制度及犹太人的仇恨。', 45.75, 16, 5, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//MeinKampf.jpg', NOW() - INTERVAL '2 days'),
('《白馬嘯西風》', '眼睁睁看着心爱之人逐一离去，无能为力的她该何去何从？', 75.00, 10, 1, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//white_horse.jpg', NOW() - INTERVAL '4 hours'),
('Gordon Ramsay Ultimate Home Cooking', 'Gordon Ramsay Ultimate Home Cooking is a collection of over 120 delicious new recipes that are infused with Gordon expertise and skill gleaned from his years in professional kitchens.', 433.99, 4, 2, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//Gordon_Ramsay_book.jpg', NOW() - INTERVAL '6 hours'),
('PHP实用教程 (第3版)', '本书以PHP 7为平台，介绍内容包含实用教程、实验指导、综合应用实习和附录4个部分，涵盖了理论和实践教学的全过程。', 19.99, 25, 3, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//php_book.jpeg', NOW() - INTERVAL '1 day'),
('Cookbook Collection', '50+ international recipes', 318.95, 7, 2, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image/cookbookCollect.jpg', NOW() - INTERVAL '3 days'),
('《东周列国志》上下冊', '《东周列国志》是一部长篇历史章回小说，为明末余邵鱼、冯梦龙所撰，清代的蔡元放编评。是一部在中国除了《三国演义》之外流传最广、影响最大的通俗历史演义。', 199.00, 3, 4, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//Eastern_Zhou.jpeg', NOW() - INTERVAL '2 hours'),
('《穆天子传》', '全书六卷：一至四卷记述周穆王西征巡游之事，五卷记述周穆王东巡河南诸地之事，六卷记述周穆王在东巡过程中为美人盛姬办理丧葬之事。内容涉及先秦时期各族的分布、迁徙、交流等情况。是西周的历史典籍之一。', 39.99, 12, 4, 'https://ebvecgyezvakcxlegspv.supabase.co/storage/v1/object/public/image//son_of_heaven_story.jpeg', NOW() - INTERVAL '4 days');

-- Example of inserting admin and regular user
INSERT INTO public.users (username, email, password, role) VALUES
('admin_user', 'admin@example.com', 'securepassword', 'admin'),
('user', 'user@example.com', 'password', 'user'),
('tom3345678', 'tomsum@gmail.com', 'password', 'user');
;

-- Insert items into shopping cart for regular_user
INSERT INTO public.shopping_cart (user_id, product_id, quantity) VALUES
(2, 1, 1),  -- 资治通鉴-精装全6册汇评精注本
(2, 2, 1),  -- 射雕英雄传（全四册）（原作平装版）
(2, 3, 1);  -- Java官方编程手册(全2册)


-- 启用 shopping_cart 表的实时功能
ALTER publication supabase_realtime ADD TABLE shopping_cart;

-- 启用 orders 表的实时功能 
ALTER publication supabase_realtime ADD TABLE orders;

-- 启用 order items 表的实时功能 
ALTER publication supabase_realtime ADD TABLE order_items;

-- 启用 products 表的实时功能
ALTER publication supabase_realtime ADD TABLE products;

-- 启用 categories 表的实时功能
ALTER publication supabase_realtime ADD TABLE categories;

-- 启用 user 表的实时功能
ALTER publication supabase_realtime ADD TABLE users;

-- 启用 comments 表的实时功能
ALTER publication supabase_realtime ADD TABLE comments;

-- 启用 order_messages 表的实时功能
ALTER publication supabase_realtime ADD TABLE order_messages;

-- 启用 view_history 表的实时功能
ALTER PUBLICATION supabase_realtime ADD TABLE view_history;

-- 启用 user_preferences 表的实时功能
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
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
