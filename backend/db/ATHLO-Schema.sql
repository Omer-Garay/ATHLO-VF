-- ============================================================================
-- SPORTS FIELD BOOKING APPLICATION - DATABASE SCHEMA
-- ============================================================================
-- Database: sports_field_booking
-- Purpose: Comprehensive schema for managing sports field providers and user bookings
-- Designed for scalability, performance, and maintainability
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE ENTITIES
-- ============================================================================

-- Users Table (Both Clients and Providers)
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    user_type ENUM('client', 'provider', 'admin') NOT NULL DEFAULT 'client',
    profile_image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    KEY idx_email (email),
    KEY idx_user_type (user_type),
    KEY idx_is_active (is_active),
    KEY idx_created_at (created_at)
);

-- Provider Profiles (Extended information for field providers)
CREATE TABLE provider_profiles (
    provider_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    company_registration_number VARCHAR(100),
    business_license_url VARCHAR(500),
    tax_id VARCHAR(50),
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings INT DEFAULT 0,
    description TEXT,
    website_url VARCHAR(500),
    bank_account_holder VARCHAR(200),
    bank_account_number VARCHAR(50),
    bank_code VARCHAR(20),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_date TIMESTAMP NULL,
    commission_rate DECIMAL(5, 2) DEFAULT 5.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    UNIQUE KEY uk_company_registration (company_registration_number),
    KEY idx_is_verified (is_verified),
    KEY idx_average_rating (average_rating)
);

-- Client Profiles (Extended information for clients)
CREATE TABLE client_profiles (
    client_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    preferences JSON,
    total_bookings INT DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    KEY idx_total_bookings (total_bookings)
);

-- ============================================================================
-- SECTION 2: FIELD & FACILITY MANAGEMENT
-- ============================================================================

-- Sports Field Types (Reference table)
CREATE TABLE sport_types (
    sport_type_id TINYINT PRIMARY KEY AUTO_INCREMENT,
    sport_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    KEY idx_sport_name (sport_name)
);

-- Sports Facilities (Provider's locations)
CREATE TABLE facilities (
    facility_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    provider_id BIGINT NOT NULL,
    facility_name VARCHAR(200) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone_number VARCHAR(20),
    email VARCHAR(120),
    description TEXT,
    amenities JSON,
    parking_available BOOLEAN DEFAULT FALSE,
    parking_fee DECIMAL(10, 2),
    wifi_available BOOLEAN DEFAULT FALSE,
    has_lighting BOOLEAN DEFAULT FALSE,
    has_changing_rooms BOOLEAN DEFAULT FALSE,
    has_shower_facilities BOOLEAN DEFAULT FALSE,
    max_capacity INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES provider_profiles(provider_id) ON DELETE CASCADE,
    KEY idx_provider_id (provider_id),
    KEY idx_city (city),
    KEY idx_is_active (is_active),
    KEY idx_coordinates (latitude, longitude)
);

-- Individual Fields within Facilities
CREATE TABLE fields (
    field_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    facility_id BIGINT NOT NULL,
    sport_type_id TINYINT NOT NULL,
    field_name VARCHAR(200) NOT NULL,
    field_number INT,
    surface_type VARCHAR(100),
    length INT,
    width INT,
    unit ENUM('meters', 'feet') DEFAULT 'meters',
    capacity INT,
    price_per_hour DECIMAL(10, 2) NOT NULL,
    price_per_day DECIMAL(10, 2),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    description TEXT,
    image_url VARCHAR(500),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id) ON DELETE CASCADE,
    FOREIGN KEY (sport_type_id) REFERENCES sport_types(sport_type_id) ON DELETE RESTRICT,
    KEY idx_facility_id (facility_id),
    KEY idx_sport_type_id (sport_type_id),
    KEY idx_is_available (is_available),
    KEY idx_is_premium (is_premium),
    KEY idx_price_per_hour (price_per_hour)
);

-- Operating Hours for Fields
CREATE TABLE field_operating_hours (
    operating_hour_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    field_id BIGINT NOT NULL,
    day_of_week TINYINT NOT NULL,  -- 0=Sunday, 1=Monday, ... 6=Saturday
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (field_id) REFERENCES fields(field_id) ON DELETE CASCADE,
    UNIQUE KEY uk_field_day (field_id, day_of_week),
    KEY idx_field_id (field_id)
);

-- ============================================================================
-- SECTION 3: BOOKING & RESERVATIONS
-- ============================================================================

-- Bookings (Core transaction table)
CREATE TABLE bookings (
    booking_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    client_id BIGINT NOT NULL,
    field_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours DECIMAL(5, 2) NOT NULL,
    number_of_players INT,  -- For group bookings
    booking_status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'pending',
    cancellation_reason VARCHAR(500),
    cancelled_by ENUM('client', 'provider', 'system') NULL,
    cancelled_at TIMESTAMP NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    discount_applied DECIMAL(10, 2) DEFAULT 0.00,
    final_price DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    qr_code_token VARCHAR(255) UNIQUE,
    -- Recurring booking fields
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50),  -- 'weekly', 'biweekly', 'monthly', etc.
    recurring_end_date DATE,  -- When the recurring series ends
    recurrence_count INT,  -- How many times it should repeat
    recurrence_completed INT DEFAULT 0,  -- How many have been completed
    parent_booking_id BIGINT,  -- For child recurring instances
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES client_profiles(client_id) ON DELETE RESTRICT,
    FOREIGN KEY (field_id) REFERENCES fields(field_id) ON DELETE RESTRICT,
    FOREIGN KEY (provider_id) REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    KEY idx_client_id (client_id),
    KEY idx_field_id (field_id),
    KEY idx_provider_id (provider_id),
    KEY idx_booking_status (booking_status),
    KEY idx_booking_date (booking_date),
    KEY idx_booking_datetime (booking_date, start_time),
    KEY idx_is_recurring (is_recurring),
    KEY idx_created_at (created_at),
    KEY idx_cancelled_at (cancelled_at)
);

-- Group Booking Participants (Track who is in a group booking)
CREATE TABLE booking_participants (
    participant_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    participant_name VARCHAR(200),  -- Name of participant (may not be a registered user)
    participant_email VARCHAR(120),
    participant_phone VARCHAR(20),
    status ENUM('invited', 'confirmed', 'declined', 'checked_in') DEFAULT 'invited',
    is_primary_booker BOOLEAN DEFAULT FALSE,  -- Is this the person who made the booking?
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES client_profiles(client_id) ON DELETE RESTRICT,
    KEY idx_booking_id (booking_id),
    KEY idx_client_id (client_id),
    KEY idx_status (status)
);

-- Time Slots (Availability/Occupancy tracking)
CREATE TABLE time_slots (
    time_slot_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    field_id BIGINT NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    booking_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (field_id) REFERENCES fields(field_id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
    UNIQUE KEY uk_field_slot (field_id, slot_date, start_time),
    KEY idx_field_id (field_id),
    KEY idx_slot_date (slot_date),
    KEY idx_is_available (is_available),
    KEY idx_field_date (field_id, slot_date)
);

-- Blocked Times (Maintenance, private bookings, etc.)
CREATE TABLE blocked_times (
    blocked_time_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    field_id BIGINT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    reason ENUM('maintenance', 'private_event', 'cleaning', 'other') NOT NULL,
    description TEXT,
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (field_id) REFERENCES fields(field_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    KEY idx_field_id (field_id),
    KEY idx_start_datetime (start_datetime),
    KEY idx_datetime_range (field_id, start_datetime, end_datetime)
);

-- ============================================================================
-- SECTION 4: PAYMENTS & TRANSACTIONS
-- ============================================================================

-- Payment Methods
CREATE TABLE payment_methods (
    payment_method_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    client_id BIGINT NOT NULL,
    payment_type ENUM('credit_card', 'debit_card', 'cash') NOT NULL,
    card_last_four VARCHAR(4),
    card_expiry_month TINYINT,
    card_expiry_year SMALLINT,
    card_holder_name VARCHAR(200),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    token_reference VARCHAR(255),  -- Reference to secure payment gateway token
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES client_profiles(client_id) ON DELETE CASCADE,
    KEY idx_client_id (client_id),
    KEY idx_is_default (is_default),
    KEY idx_payment_type (payment_type)
);

-- Payments (Transaction history)
CREATE TABLE payments (
    payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    payment_method_id BIGINT,  -- NULL for cash payments
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    transaction_reference VARCHAR(255) UNIQUE,
    payment_gateway VARCHAR(100),  -- Stripe, etc. (NULL for cash)
    gateway_response JSON,
    error_message TEXT,
    paid_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES client_profiles(client_id) ON DELETE RESTRICT,
    FOREIGN KEY (provider_id) REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(payment_method_id) ON DELETE SET NULL,
    KEY idx_booking_id (booking_id),
    KEY idx_client_id (client_id),
    KEY idx_provider_id (provider_id),
    KEY idx_payment_status (payment_status),
    KEY idx_paid_at (paid_at),
    KEY idx_created_at (created_at),
    KEY idx_transaction_reference (transaction_reference)
);

-- Provider Payouts (Earnings and withdrawals)
CREATE TABLE provider_payouts (
    payout_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    provider_id BIGINT NOT NULL,
    payout_period_start DATE NOT NULL,
    payout_period_end DATE NOT NULL,
    total_earnings DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    net_payout DECIMAL(10, 2) NOT NULL,
    payout_status ENUM('pending', 'processed', 'failed') NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(100),
    bank_account_used VARCHAR(50),
    transaction_reference VARCHAR(255),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    KEY idx_provider_id (provider_id),
    KEY idx_payout_status (payout_status),
    KEY idx_payout_period (payout_period_start, payout_period_end),
    KEY idx_created_at (created_at)
);

-- ============================================================================
-- SECTION 5: REVIEWS & RATINGS
-- ============================================================================

-- Field Ratings (Client ratings only - no text reviews)
CREATE TABLE field_ratings (
    rating_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    field_id BIGINT NOT NULL,
    booking_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    is_verified_booking BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (field_id) REFERENCES fields(field_id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES client_profiles(client_id) ON DELETE CASCADE,
    UNIQUE KEY uk_booking_rating (booking_id),
    KEY idx_field_id (field_id),
    KEY idx_client_id (client_id),
    KEY idx_rating (rating),
    KEY idx_created_at (created_at)
);

-- Provider Ratings (Client ratings of providers only - no text reviews)
CREATE TABLE provider_ratings (
    provider_rating_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    provider_id BIGINT NOT NULL,
    facility_id BIGINT,
    client_id BIGINT NOT NULL,
    booking_id BIGINT,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES provider_profiles(provider_id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(facility_id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES client_profiles(client_id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
    KEY idx_provider_id (provider_id),
    KEY idx_facility_id (facility_id),
    KEY idx_client_id (client_id),
    KEY idx_rating (rating),
    KEY idx_created_at (created_at)
);

-- ============================================================================
-- SECTION 6: COMMUNICATIONS & SUPPORT
-- ============================================================================

-- Messages (Chat between clients and providers)
CREATE TABLE messages (
    message_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    booking_id BIGINT,
    message_text TEXT NOT NULL,
    message_type ENUM('text', 'image', 'document') DEFAULT 'text',
    attachment_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
    KEY idx_sender_id (sender_id),
    KEY idx_receiver_id (receiver_id),
    KEY idx_booking_id (booking_id),
    KEY idx_is_read (is_read),
    KEY idx_created_at (created_at),
    KEY idx_conversation (sender_id, receiver_id)
);

-- Support Tickets
CREATE TABLE support_tickets (
    ticket_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    booking_id BIGINT,
    issue_category VARCHAR(100) NOT NULL,
    subject VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'on_hold', 'resolved', 'closed') DEFAULT 'open',
    assigned_to_admin_id BIGINT,
    resolution_notes TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to_admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
    KEY idx_user_id (user_id),
    KEY idx_status (status),
    KEY idx_priority (priority),
    KEY idx_created_at (created_at)
);

-- ============================================================================
-- SECTION 7: PROMOTIONS & LOYALTY
-- ============================================================================

-- Promotional Codes/Coupons (Simplified for your needs)
CREATE TABLE promotional_codes (
    promo_code_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount_value DECIMAL(10, 2),
    minimum_booking_amount DECIMAL(10, 2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    applicable_to ENUM('all_fields', 'specific_provider', 'specific_field') DEFAULT 'all_fields',
    provider_id BIGINT,
    field_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_admin_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES provider_profiles(provider_id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES fields(field_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE KEY uk_promo_code (code),
    KEY idx_is_active (is_active),
    KEY idx_valid_dates (valid_from, valid_until)
);

-- ============================================================================
-- SECTION 8: NOTIFICATIONS & PREFERENCES
-- ============================================================================

-- Notification Preferences
CREATE TABLE notification_preferences (
    notification_pref_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    booking_confirmation_email BOOLEAN DEFAULT TRUE,
    booking_reminder_email BOOLEAN DEFAULT TRUE,
    booking_reminder_sms BOOLEAN DEFAULT FALSE,
    promotional_email BOOLEAN DEFAULT TRUE,
    promotional_sms BOOLEAN DEFAULT FALSE,
    new_field_nearby_email BOOLEAN DEFAULT FALSE,
    price_drop_notification BOOLEAN DEFAULT FALSE,
    cancellation_notification BOOLEAN DEFAULT TRUE,
    payment_notification_email BOOLEAN DEFAULT TRUE,
    review_request_email BOOLEAN DEFAULT TRUE,
    support_update_notification BOOLEAN DEFAULT TRUE,
    newsletter BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    KEY idx_user_id (user_id)
);

-- Notifications (Log of sent notifications)
CREATE TABLE notifications (
    notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(300),
    message TEXT NOT NULL,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    notification_channel ENUM('email', 'sms', 'push', 'in_app') DEFAULT 'in_app',
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    KEY idx_user_id (user_id),
    KEY idx_is_read (is_read),
    KEY idx_notification_type (notification_type),
    KEY idx_sent_at (sent_at)
);

-- ============================================================================
-- SECTION 9: ANALYTICS & AUDIT
-- ============================================================================

-- Activity Logs (Audit trail)
CREATE TABLE activity_logs (
    activity_log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    KEY idx_user_id (user_id),
    KEY idx_action_type (action_type),
    KEY idx_entity_type (entity_type),
    KEY idx_created_at (created_at)
);

-- User Search History
CREATE TABLE search_history (
    search_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    sport_type_id TINYINT,
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    search_radius_km INT,
    search_date DATE,
    search_time_from TIME,
    search_time_to TIME,
    filters JSON,
    results_count INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES client_profiles(client_id) ON DELETE CASCADE,
    FOREIGN KEY (sport_type_id) REFERENCES sport_types(sport_type_id) ON DELETE SET NULL,
    KEY idx_user_id (user_id),
    KEY idx_created_at (created_at)
);

-- ============================================================================
-- SECTION 10: REFERENCE DATA
-- ============================================================================

-- Insert default sport types
INSERT INTO sport_types (sport_name, description) VALUES
('Soccer', 'Association football'),
('Basketball', 'Basketball courts'),
('Tennis', 'Tennis courts'),
('Badminton', 'Badminton courts'),
('Volleyball', 'Volleyball courts'),
('Cricket', 'Cricket grounds'),
('Squash', 'Squash courts'),
('Table Tennis', 'Table tennis tables'),
('Pickleball', 'Pickleball courts'),
('Racquetball', 'Racquetball courts')
ON DUPLICATE KEY UPDATE sport_name=sport_name;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
