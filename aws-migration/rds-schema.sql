-- PostgreSQL schema for OpenBB private companies database
-- Migrated from SQLite

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(500),
    industry VARCHAR(255),
    sub_industry VARCHAR(255),
    founded_year INTEGER,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_founded_year ON companies(founded_year);
CREATE INDEX idx_companies_funding_total ON companies(funding_total);

-- Incremental companies table
CREATE TABLE IF NOT EXISTS incremental_companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(500),
    industry VARCHAR(255),
    sub_industry VARCHAR(255),
    founded_year INTEGER,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for incremental table
CREATE INDEX idx_incremental_companies_name ON incremental_companies(name);
CREATE INDEX idx_incremental_companies_created_at ON incremental_companies(created_at);