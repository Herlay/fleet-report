-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 20, 2026 at 01:32 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fleet_analytics`
--

-- --------------------------------------------------------

--
-- Table structure for table `report_cache`
--

CREATE TABLE `report_cache` (
  `id` int(11) NOT NULL,
  `week_identifier` varchar(50) DEFAULT NULL,
  `ai_content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ai_content`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trips`
--

CREATE TABLE `trips` (
  `id` int(11) NOT NULL,
  `sn` varchar(50) DEFAULT NULL,
  `trip_id` varchar(100) NOT NULL,
  `trip_category` varchar(100) DEFAULT NULL,
  `data_entry_type` varchar(100) DEFAULT NULL,
  `trip_date` date NOT NULL,
  `client` varchar(255) DEFAULT NULL,
  `cargo_description` text DEFAULT NULL,
  `container_no` varchar(100) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `truck_number` varchar(100) NOT NULL,
  `origin` varchar(150) DEFAULT NULL,
  `destination` varchar(150) DEFAULT NULL,
  `fleet` varchar(150) DEFAULT NULL,
  `driver_name` varchar(150) DEFAULT NULL,
  `shipping_line` varchar(150) DEFAULT NULL,
  `road_expenses` decimal(15,2) DEFAULT 0.00,
  `dispatch` decimal(15,2) DEFAULT 0.00,
  `fuel_cost` decimal(15,2) DEFAULT 0.00,
  `cost_per_litre` decimal(10,2) DEFAULT 0.00,
  `litres` decimal(10,2) DEFAULT 0.00,
  `trip_rate` decimal(15,2) DEFAULT 0.00,
  `charges` decimal(15,2) DEFAULT 0.00,
  `profit` decimal(15,2) DEFAULT 0.00,
  `uploaded_week` varchar(50) DEFAULT NULL,
  `fleet_manager` varchar(150) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `maintenance` decimal(15,2) DEFAULT 0.00,
  `week_start_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trucks`
--

CREATE TABLE `trucks` (
  `id` int(11) NOT NULL,
  `truck_number` varchar(20) NOT NULL,
  `brand` varchar(50) NOT NULL,
  `fleet` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `report_cache`
--
ALTER TABLE `report_cache`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `week_identifier` (`week_identifier`);

--
-- Indexes for table `trips`
--
ALTER TABLE `trips`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `trip_id` (`trip_id`),
  ADD KEY `trip_date` (`trip_date`),
  ADD KEY `truck_number` (`truck_number`),
  ADD KEY `fleet_manager` (`fleet_manager`),
  ADD KEY `brand` (`brand`),
  ADD KEY `week_start_date` (`week_start_date`);

--
-- Indexes for table `trucks`
--
ALTER TABLE `trucks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `truck_number` (`truck_number`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `report_cache`
--
ALTER TABLE `report_cache`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trips`
--
ALTER TABLE `trips`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trucks`
--
ALTER TABLE `trucks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
