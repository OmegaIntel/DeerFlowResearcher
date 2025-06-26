-- MySQL schema for OpenBB private companies database
-- For use with existing RDS MySQL instance

USE omni_ai;

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(500),
    industry VARCHAR(255),
    sub_industry VARCHAR(255),
    founded_year INT,
    employee_count VARCHAR(50),
    headquarters VARCHAR(500),
    funding_total DECIMAL(20, 2),
    last_funding_date DATE,
    last_funding_amount DECIMAL(20, 2),
    last_funding_round VARCHAR(100),
    investors TEXT,
    revenue_estimate VARCHAR(100),
    growth_rate VARCHAR(50),
    market VARCHAR(100),
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_industry (industry),
    INDEX idx_founded_year (founded_year),
    INDEX idx_funding_total (funding_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Incremental companies table
CREATE TABLE IF NOT EXISTS incremental_companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(500),
    industry VARCHAR(255),
    sub_industry VARCHAR(255),
    founded_year INT,
    employee_count VARCHAR(50),
    headquarters VARCHAR(500),
    funding_total DECIMAL(20, 2),
    last_funding_date DATE,
    last_funding_amount DECIMAL(20, 2),
    last_funding_round VARCHAR(100),
    investors TEXT,
    revenue_estimate VARCHAR(100),
    growth_rate VARCHAR(50),
    market VARCHAR(100),
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;