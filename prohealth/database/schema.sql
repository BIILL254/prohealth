-- ProHealth Online Pharmacy System: MySQL 8 schema (generated from the schema diagram)
CREATE DATABASE IF NOT EXISTS prohealth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE prohealth_db;

CREATE TABLE roles (
  role_id INT NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(30) NOT NULL UNIQUE,
  PRIMARY KEY (role_id)
) ENGINE=InnoDB;

CREATE TABLE users (
  user_id INT NOT NULL AUTO_INCREMENT,
  role_id INT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(15) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB;

CREATE TABLE password_resets (
  reset_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (reset_id),
  CONSTRAINT fk_password_resets_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE addresses (
  address_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  label VARCHAR(30) NOT NULL,
  street VARCHAR(150) NOT NULL,
  town VARCHAR(60) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (address_id),
  CONSTRAINT fk_addresses_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE categories (
  category_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  PRIMARY KEY (category_id)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  supplier_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(120) NULL,
  address VARCHAR(150) NULL,
  PRIMARY KEY (supplier_id)
) ENGINE=InnoDB;

CREATE TABLE medicines (
  medicine_id INT NOT NULL AUTO_INCREMENT,
  category_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  generic_name VARCHAR(120) NULL,
  description TEXT NULL,
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  requires_prescription TINYINT(1) NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 10,
  image_url VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (medicine_id),
  CONSTRAINT fk_medicines_category_id FOREIGN KEY (category_id) REFERENCES categories(category_id)
) ENGINE=InnoDB;

CREATE TABLE stock_batches (
  batch_id INT NOT NULL AUTO_INCREMENT,
  medicine_id INT NOT NULL,
  supplier_id INT NOT NULL,
  batch_number VARCHAR(40) NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 0),
  cost_price DECIMAL(10,2) NOT NULL,
  received_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  PRIMARY KEY (batch_id),
  UNIQUE KEY uq_stock_batches_medicine_id_batch_number (medicine_id, batch_number),
  CONSTRAINT fk_stock_batches_medicine_id FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id),
  CONSTRAINT fk_stock_batches_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  cart_item_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  medicine_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cart_item_id),
  UNIQUE KEY uq_cart_items_user_id_medicine_id (user_id, medicine_id),
  CONSTRAINT fk_cart_items_user_id FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_cart_items_medicine_id FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
) ENGINE=InnoDB;

CREATE TABLE prescriptions (
  prescription_id INT NOT NULL AUTO_INCREMENT,
  customer_id INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewer_notes VARCHAR(255) NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  PRIMARY KEY (prescription_id),
  CONSTRAINT fk_prescriptions_customer_id FOREIGN KEY (customer_id) REFERENCES users(user_id),
  CONSTRAINT fk_prescriptions_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE orders (
  order_id INT NOT NULL AUTO_INCREMENT,
  customer_id INT NOT NULL,
  address_id INT NULL,
  prescription_id INT NULL,
  fulfilment_type ENUM('delivery','pickup') NOT NULL,
  status ENUM('pending','paid','processing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  CONSTRAINT fk_orders_customer_id FOREIGN KEY (customer_id) REFERENCES users(user_id),
  CONSTRAINT fk_orders_address_id FOREIGN KEY (address_id) REFERENCES addresses(address_id),
  CONSTRAINT fk_orders_prescription_id FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  order_item_id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  medicine_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (order_item_id),
  CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_order_items_medicine_id FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
) ENGINE=InnoDB;

CREATE TABLE payments (
  payment_id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL UNIQUE,
  method ENUM('mpesa') NOT NULL DEFAULT 'mpesa',
  phone VARCHAR(15) NOT NULL,
  checkout_request_id VARCHAR(60) NULL,
  mpesa_receipt VARCHAR(20) NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  PRIMARY KEY (payment_id),
  CONSTRAINT fk_payments_order_id FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  log_id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(60) NOT NULL,
  table_name VARCHAR(60) NULL,
  record_id INT NULL,
  details TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

INSERT INTO roles (role_name) VALUES ('customer'), ('pharmacist'), ('admin');
