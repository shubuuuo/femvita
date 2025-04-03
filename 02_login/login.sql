CREATE DATABASE user_data;

USE user_data;

CREATE TABLE login_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    age INT NOT NULL
);
