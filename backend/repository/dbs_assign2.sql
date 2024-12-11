-------------------- CREATE DATABASE ----------------------
CREATE DATABASE IF NOT EXISTS STUDENT_SMART_PRINT_SERVICE;

USE STUDENT_SMART_PRINT_SERVICE;

-------------------- CREATE TABLE ----------------------

CREATE TABLE IF NOT EXISTS USERS (
  USER_ID INT AUTO_INCREMENT PRIMARY KEY,
  EMAIL VARCHAR(100) UNIQUE NOT NULL,
  PASSWORD VARCHAR(100) NOT NULL,
  ROLE ENUM("STUDENT","ADMIN")
);

CREATE TABLE IF NOT EXISTS ADDRESS (
  ADDRESS_ID INT AUTO_INCREMENT PRIMARY KEY,
  STREET VARCHAR(100),
  PROVINCE VARCHAR(100),
  CITY VARCHAR(100),
  COUNTRY VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS STUDENTS (
  USER_ID INT PRIMARY KEY,
  STUDENT_ID CHAR(7) UNIQUE NOT NULL,
  STUDENT_NAME VARCHAR(100) NOT NULL,
  FACULTY VARCHAR(100) NOT NULL,
  MAJOR VARCHAR(100) NOT NULL,
  ADDRESS_ID INT NOT NULL,
  CHARGED_PAGES INT DEFAULT 0,
  FREE_PAGES_PER_YEAR INT DEFAULT 0,
  RECEIVED_DATE DATE DEFAULT NULL,
  FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID) 
  ON DELETE CASCADE,
  FOREIGN KEY (ADDRESS_ID) REFERENCES ADDRESS(ADDRESS_ID) 
  ON DELETE CASCADE
  ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ADMINS (
  USER_ID INT PRIMARY KEY,
  ADMIN_ID INT AUTO_INCREMENT UNIQUE NOT NULL,
  ADMIN_NAME VARCHAR(100) NOT NULL,
  FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID)
  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PRINTERS (
  PRINTER_ID INT AUTO_INCREMENT PRIMARY KEY,
  PERMITTED_TYPE VARCHAR(100) NOT NULL,
  BRAND VARCHAR(100) NOT NULL,
  MODEL VARCHAR(100) NOT NULL,
  ENABLE BOOLEAN DEFAULT 1 ,
  DESCRIPTION VARCHAR(200),
  CAMPUS_NAME VARCHAR(100),
  BUILDING_NAME VARCHAR(100),
  ROOM_NUMBER INT
);

CREATE TABLE IF NOT EXISTS FILES (
  FILE_ID INT AUTO_INCREMENT PRIMARY KEY,
  STUDENT_ID CHAR(7),
  FILE_NAME VARCHAR(100) NOT NULL,
  FILE_TYPE VARCHAR(30),
  FOREIGN KEY (STUDENT_ID) REFERENCES STUDENTS(STUDENT_ID)
);

CREATE TABLE IF NOT EXISTS PRINT_PROPERTIES (
  PRINTING_NUMBER INT AUTO_INCREMENT PRIMARY KEY,
  STUDENT_ID CHAR(7),
  PRINTER_ID INT,
  FILE_ID INT,
  DOUBLE_SIZE BOOLEAN DEFAULT 1,
  PAGE_SIZE TINYINT DEFAULT 4,
  NUMBER_OF_COPIES INT DEFAULT 0,
  FOREIGN KEY (STUDENT_ID) REFERENCES STUDENTS(STUDENT_ID)
  ON DELETE CASCADE,
  FOREIGN KEY (PRINTER_ID) REFERENCES PRINTERS(PRINTER_ID)
  ON DELETE CASCADE,
  FOREIGN KEY (FILE_ID) REFERENCES FILES(FILE_ID)
  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PAGES_TO_PRINTED (
  PRINTING_NUMBER INT,
  PAGE VARCHAR(10) NOT NULL,
  PRIMARY KEY (PRINTING_NUMBER, PAGE),
  FOREIGN KEY (PRINTING_NUMBER) REFERENCES PRINT_PROPERTIES(PRINTING_NUMBER)
  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS LOGS (
  LOG_NUMBER INT AUTO_INCREMENT PRIMARY KEY,
  PRINTING_NUMBER INT,
  START_TIME DATETIME,
  END_TIME DATETIME,
  NUMS_OF_PAGES INT NOT NULL,
  TOTAL_CHARGED_PAGES INT NOT NULL,
  FOREIGN KEY (PRINTING_NUMBER) REFERENCES PRINT_PROPERTIES(PRINTING_NUMBER)
);

CREATE TABLE IF NOT EXISTS PAYMENTS (
  STUDENT_ID CHAR(7),
  NUM_OF_PAGES INT,
  UNIT_PRICE DECIMAL DEFAULT 1000,
  PRICE DECIMAL(10,2),
  FOREIGN KEY (STUDENT_ID) REFERENCES STUDENTS(STUDENT_ID)
);

-------------------- CREATE TRIGGERS ----------------------

-- TRIGGER : CHARGE_PAGES_OF_STUDENT
-- PURPOSE : CHARGE CHARGED_PAGES IN STUDENT'S ACCOUNT WHEN STUDENT PRINT A DOCUMENT
CREATE TRIGGER IF NOT EXISTS CHARGE_PAGES_OF_STUDENT 
BEFORE INSERT ON LOGS 
FOR EACH ROW
BEGIN
  UPDATE STUDENTS 
  SET CHARGED_PAGES = CHARGED_PAGES - NEW.TOTAL_CHARGED_PAGES
  WHERE STUDENT_ID = (
                        SELECT STUDENT_ID
                        FROM PRINT_PROPERTIES
                        WHERE NEW.PRINTING_NUMBER = PRINT_PROPERTIES.PRINTING_NUMBER
                     );
END;

-- TRIGGER : CACULATE_PRICE
-- PURPOSE : CACULATE PRICE AUTOMATICALLY WHEN STUDENT BUY MORE PAGES TO PRINT
CREATE TRIGGER IF NOT EXISTS CACULATE_BILL
BEFORE INSERT ON PAYMENTS
FOR EACH ROW
BEGIN
  SET NEW.PRICE = NEW.UNIT_PRICE * NEW.NUM_OF_PAGES;
END;


-------------------- CREATE PROCEDURES AND FUNCTIONS ----------------------

-- PROCEDURE: INSERT_STUDENT
-- PURPOSE: CREATE USER AND ADDRESS AUTOMATICALLY AND VALIDATE INPUT AFTER THAT INSERT STUDENT INTO STUDENTS TABLE
-- INPUTS :
/* 
  studentId : char(7),
  name : varchar(100),
  email : varchar(100),
  password : varchar(100),
  faculty : varchar(100),
  major : varchar(100),
  street : varchar(100),
  province : varchar(100),
  country : varchar(100)
*/


CREATE PROCEDURE IF NOT EXISTS INSERT_STUDENT(
  p_studentId CHAR(7),
  p_name VARCHAR(100),
  p_email VARCHAR(100),
  p_password VARCHAR(100),
  p_faculty VARCHAR(100),
  p_major VARCHAR(100),
  p_street VARCHAR(100),
  p_province VARCHAR(100),
  p_city VARCHAR(100),
  p_country VARCHAR(100)
)
BEGIN
  IF NOT EXISTS (
                  SELECT * 
                  FROM STUDENTS
                  WHERE STUDENT_ID = p_studentId
                )
  THEN
    BEGIN
      DECLARE v_addressId INT;
      DECLARE v_userId INT;
      -- CREATE USER (FIND USER IF NOT EXITS CREATE A NEW ONE ELSE THROW ERROR)
      IF NOT EXISTS (
                      SELECT * 
                      FROM USERS
                      WHERE EMAIL = p_email
                    )
      THEN
        INSERT INTO USERS (EMAIL, PASSWORD , ROLE ) VALUES (p_email,p_password,'STUDENT');
      ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'THE EMAIL HAVE ALREADY EXISTED';
      END IF;
      -- CREATE ADDRESS (FIND ADDRESS IF NOT EXITS CREATE A NEW ONE)
      IF NOT EXISTS ( 
                      SELECT *
                      FROM ADDRESS 
                      WHERE STREET = p_street AND PROVINCE = p_province AND CITY = p_city AND COUNTRY = p_country
                    )
      THEN
        INSERT INTO ADDRESS (STREET, PROVINCE , CITY , COUNTRY) VALUES (p_street,p_province,p_city,p_country);
      END IF;
      -- INSERT STUDENT INTO STUDENTS TABLE
      SET v_addressId = (
                          SELECT ADDRESS_ID 
                          FROM ADDRESS 
                          WHERE STREET = p_street AND PROVINCE = p_province AND CITY = p_city AND COUNTRY = p_country
                        );
      SET v_userId = (
                        SELECT USER_ID 
                        FROM USERS
                        WHERE EMAIL = p_email AND PASSWORD = p_password
                     );
      INSERT INTO STUDENTS (USER_ID, STUDENT_ID, STUDENT_NAME, FACULTY, MAJOR, ADDRESS_ID ) VALUES (v_userId,p_studentId,p_name,p_faculty,p_major,v_addressId);
    END;
  ELSE
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'THE STUDENT HAVE ALREADY EXISTED';
  END IF;
END;


-- PROCEDURE: INSERT_ADMIN
-- PURPOSE: CREATE USER AUTOMATICALLY AND VALIDATE INPUT AFTER THAT INSERT ADIN INTO ADMINS TABLE
-- INPUTS :
/* 
  email : varchar(100),
  password : varchar(100),
  name: varchar(100)
*/

CREATE PROCEDURE IF NOT EXISTS INSERT_ADMIN(
  p_email VARCHAR(100),
  p_password VARCHAR(100),
  p_name VARCHAR(100)
)
BEGIN
  -- CREATE ADMIN (FIND USER IF NOT EXISTS CREATE A NEW ONE ELSE THROW ERROR)
  IF NOT EXISTS (
                  SELECT * 
                  FROM USERS
                  WHERE EMAIL = p_email
                )
  THEN
    BEGIN
      DECLARE v_userId INT;
      INSERT INTO USERS (EMAIL, PASSWORD , ROLE ) VALUES (p_email,p_password,'ADMIN');
      SET v_userId = (
                        SELECT USER_ID 
                        FROM USERS
                        WHERE EMAIL = p_email AND PASSWORD = p_password 
                     );
      INSERT INTO ADMINS (USER_ID, ADMIN_NAME) VALUES (v_userId,p_name);
    END;
  ELSE
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'THE EMAIL HAVE ALREADY EXISTED';
  END IF;
END;

-- PROCEDURE: INSERT_PAGES_TO_PRINTED
-- PURPOSE: INSERT PAGES TO PRINTED INTO PAGES_TO_PRINTED TABLE BY PROCESS STRING SEPARATE BY COMMA
-- INPUT :
/* 
  printingNumber : INT,
  pagetoPrinted : VARCHAR(100) (A string, which is separated by comma. example: '1,3,5,7,9' )
*/

CREATE PROCEDURE IF NOT EXISTS INSERT_PAGES_TO_PRINTED (
  p_printingNumber INT,
  p_pageToPrinted VARCHAR(100)
)
BEGIN
  DECLARE curChar CHAR(1);
  DECLARE tmpChar VARCHAR(10) DEFAULT '';
  DECLARE curString VARCHAR(100);

  SET curString = TRIM(p_pageToPrinted);

  WHILE CHARACTER_LENGTH(curString) > 0 DO
    SET curChar = LEFT(curString, 1);

    IF ASCII(curChar) >= 48 AND ASCII(curChar) <= 57 THEN
      -- If the character is a number, concatenate it to tmpChar
      SET tmpChar = CONCAT(tmpChar, curChar);
    ELSEIF ASCII(curChar) = 44 THEN
      -- If the character is a comma, insert tmpChar into the table
      IF tmpChar != '' THEN
        INSERT INTO PAGES_TO_PRINTED VALUES (p_printingNumber,tmpChar);
      END IF;
      SET tmpChar = ''; -- Reset tmpChar after inserting
    END IF;

    -- Trim the processed character from curString
    SET curString = SUBSTRING(curString, 2);
  END WHILE;

  -- Insert any remaining number after the loop
  IF tmpChar != '' THEN
    INSERT INTO PAGES_TO_PRINTED VALUES (p_printingNumber,tmpChar);
  END IF;
END ;


-- PROCEDURE: INSERT_LOG
-- PURPOSE: CREATE LOG AND CACULATE TOTAL_CHARGED_PAGES AUTOMATICALLY 
-- INPUT :
/* 
  studentId : CHAR(7),
  printerId : INT,
  fileId : INT,
  doubleSize : BOOLEAN (value is INT 0 is false, >0 is true),
  pageSize : INT (value stand for pagesize. example: 4 : A4 , 3  : A3 ,... ),
  numOfCopies : INT,
  pagetoPrinted : VARCHAR(100) (A string, which is separated by comma. example: '1,3,5,7,9' )
*/

CREATE PROCEDURE IF NOT EXISTS INSERT_LOG(
  p_studentId CHAR(7),
  p_printerId INT,
  p_fileId INT,
  p_doubleSize BOOLEAN,
  p_pageSize TINYINT ,
  p_numsOfCopies INT ,
  p_pageToPrinted VARCHAR(100)
)
BEGIN
  DECLARE v_printNumber INT;
  DECLARE v_numsOfPage INT;
  DECLARE v_total_charged_page INT;
  DECLARE v_charged_page_of_student INT;
  -- CHECH VALID PAGESIZE ?
  IF p_pageSize < 0 OR p_pageSize > 4
  THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'INVALID PAGE SIZE';
  END IF;
  -- CHECK STUDENT IS EXISTS ?
  IF NOT EXISTS (
                  SELECT *
                  FROM STUDENTS
                  WHERE STUDENT_ID = p_studentId
                )
  THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'THE STUDENT DO NOT EXIST';
  END IF;
  -- CHECH PRINTER IS EXISTS ?
  IF NOT EXISTS (
                  SELECT *
                  FROM PRINTERS
                  WHERE PRINTER_ID = p_printerId
                )
  THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'THE PRINTER DO NOT EXIST';
  END IF;
  -- CHECH FILE IS EXISTS ?
  IF NOT EXISTS (
                  SELECT *
                  FROM FILES
                  WHERE FILE_ID = p_fileId
                )
  THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'THE FILE DO NOT EXIST';
  END IF;
  -- CACULATE NUMBER OF PAGES TO CHARGE PAGES OF STUDENT
  SET v_charged_page_of_student = (
                                    SELECT CHARGED_PAGES
                                    FROM STUDENTS
                                    WHERE STUDENT_ID = p_studentId
                                  );
  SET v_numsOfPage =  CACULATE_NUMBER_OF_PAGES(p_pageToPrinted);
  SET v_total_charged_page =  CACULATE_TOTAL_CHARGED_PAGE(v_numsOfPage,p_numsOfCopies,p_pageSize);
  -- CHECK CHARGED_PAGES IS ENOUGH ?
  IF v_charged_page_of_student < v_total_charged_page
  THEN 
     SIGNAL SQLSTATE '45000'
     SET MESSAGE_TEXT = 'THE STUDENT DOES NOT HAVE ENOUGH PAGES TO CHARGE';
  END IF;
  -- INSERT PRINTING PROPERTIES
  INSERT INTO PRINT_PROPERTIES(STUDENT_ID,PRINTER_ID,FILE_ID,DOUBLE_SIZE,PAGE_SIZE,NUMBER_OF_COPIES)
  VALUES(p_studentId,p_printerId,p_fileId,p_doubleSize,p_pageSize,p_numsOfCopies);
  SET v_printNumber = (
                      SELECT MAX(PRINTING_NUMBER)
                      FROM PRINT_PROPERTIES
                      WHERE STUDENT_ID = p_studentId AND PRINTER_ID = p_printerId AND FILE_ID = p_fileId
                    );
  -- INSERT PAGES TO BE PRINTED
  CALL INSERT_PAGES_TO_PRINTED (v_printNumber,p_pageToPrinted);
  INSERT INTO LOGS(PRINTING_NUMBER,START_TIME,END_TIME,NUMS_OF_PAGES,TOTAL_CHARGED_PAGES)
  VALUES(v_printNumber,CURRENT_TIMESTAMP(),NULL,v_numsOfPage,v_total_charged_page);
END;


-- PROCEDURE: BUY_MORE_PAGES
-- PURPOSE: STIMULATE BUYING MORE PAGE TO PRINT
-- INPUT :
/* 
  studentId : CHAR(7),
  numOfPagfe : INT
*/

CREATE PROCEDURE IF NOT EXISTS BUY_MORE_PAGES (
  p_studentId CHAR(7),
  p_numsOfPage INT
)
BEGIN
  IF NOT EXISTS (
                  SELECT *
                  FROM STUDENTS
                  WHERE p_studentId = STUDENT_ID
                )
  THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'THE STUDENT DO NOT EXIST';
  END IF;
  IF p_numsOfPage < 1
  THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'NUMER OF PAGES MUST BE GREATER THAN 0';
  END IF;
  -- UPDATE CHARGED_PAGES OF STUDENT
  UPDATE STUDENTS
  SET CHARGED_PAGES = CHARGED_PAGES + p_numsOfPage
  WHERE STUDENT_ID = p_studentId;
  -- INSERT INTO PAYMENT
  INSERT INTO PAYMENTS(STUDENT_ID,NUM_OF_PAGES) VALUES (p_studentId,p_numsOfPage); 
END;


-- FUNCTION: CACULATE_TOTAL_CHARGED_PAGE
-- PURPOSE: CACULATE TOTAL CHARGED PAGE BY NUMBER OF PAGES, NUMBER OF COPIES AND PAGESIZE 
-- INPUT :
/* 
  numOfPage : INT,
  numOfCopies : INT,
  pageSize : INT (value stand for pagesize. example: 4 : A4 , 3  : A3 ,... )
*/
-- OUTPUT:
/*
  totalChargedPage : INT
*/
CREATE FUNCTION IF NOT EXISTS CACULATE_TOTAL_CHARGED_PAGE(
  p_numsOfPage INT,
  p_numsOfCopies INT,
  p_pageSize INT
)
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE v_numPageA4 INT;
  DECLARE v_totalPageA4 INT;
  SET v_numPageA4 = POW(2,(4-p_pageSize));
  SET v_totalPageA4 = (v_numPageA4 * p_numsOfPage) + ((v_numPageA4 * p_numsOfPage) * p_numsOfCopies);
  RETURN (v_totalPageA4);
END;

-- FUNCTION: CACULATE_NUMBER_OF_PAGES
-- PURPOSE: CACULATE NUMER OF PAGES WHICH STUDENT USES FOR PRINTING DOCUMENTS BY STRING PROCESSING
-- INPUT :
/* 
   pagetoPrinted : VARCHAR(100) (A string, which is separated by comma. example: '1,3,5,7,9' )
*/
-- OUTPUT:
/*
  numOfPages : INT
*/

CREATE FUNCTION IF NOT EXISTS CACULATE_NUMBER_OF_PAGES(
  p_pageToPrinted VARCHAR(100)
)
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE curChar CHAR(1);
  DECLARE tmpChar VARCHAR(10) DEFAULT '';
  DECLARE curString VARCHAR(100);
  DECLARE numOfPages INT DEFAULT 0;
  SET curString = TRIM(p_pageToPrinted);

  WHILE CHARACTER_LENGTH(curString) > 0 DO
    SET curChar = LEFT(curString, 1);

    IF ASCII(curChar) >= 48 AND ASCII(curChar) <= 57 THEN
      -- If the character is a number, concatenate it to tmpChar
      SET tmpChar = CONCAT(tmpChar, curChar);
    ELSEIF ASCII(curChar) = 44 THEN
      -- If the character is a comma, insert tmpChar into the table
      IF tmpChar != '' THEN
        SET numOfPages = numOfPages + 1;
      END IF;
      SET tmpChar = ''; -- Reset tmpChar after inserting
    END IF;

    -- Trim the processed character from curString
    SET curString = SUBSTRING(curString, 2);
  END WHILE;

  -- Insert any remaining number after the loop
  IF tmpChar != '' THEN
    SET numOfPages = numOfPages + 1;
  END IF;
  RETURN (numOfPages);
END ;


-------------------- INSERT DATA ----------------------
-- STUDENT 
CALL INSERT_STUDENT(
  '2211101',
  'Batman',
  'batman@hcmut.edu.vn',
  'matcha',
  'computer science and computer engineering',
  'computer science',
  '',
  'New Jersey',
  'Gotham City',
  'USA'
);
CALL INSERT_STUDENT(
  '2211102',
  'Joker',
  'joker@hcmut.edu.vn',
  'iwillkillyou',
  'computer science and computer engineering',
  'computer science',
  '',
  'New Jersey',
  'Gotham City',
  'USA'
);
CALL INSERT_STUDENT(
  '2211103',
  'Harley Quinn',
  'harley@hcmut.edu.vn',
  'ilovejoker',
  'computer science and computer engineering',
  'computer science',
  '',
  'New Jersey',
  'Gotham City',
  'USA'
);
CALL INSERT_STUDENT('2211104','Superman','Superman@hcmut.edu.vn','iampower','computer science and computer engineering','computer science','','New Jersey','Gotham City','USA');
CALL INSERT_STUDENT('2211105','Wonder Woman','ww@hcmut.edu.vn','swordandshield','computer science and computer engineering','computer science','','New Jersey','Gotham City','USA');
CALL INSERT_STUDENT('2211106','Spiderman','spiderman@hcmut.edu.vn','gohome','computer science and computer engineering','computer science','','New Jersey','Gotham City','USA');
CALL INSERT_STUDENT('2211107','The Flash','tf@hcmut.edu.vn','speedlikeflash','computer science and computer engineering','computer science','','New Jersey','Gotham City','USA');
-- ADMIN
CALL INSERT_ADMIN('dc@hcmut.edu.vn','dccommics','DC Commics');
CALL INSERT_ADMIN('phuoc@hcmut.edu.vn','phuock22','123wer');
CALL INSERT_ADMIN('phuong@hcmut.edu.vn','phuongk22','123123qw!');
CALL INSERT_ADMIN('bao@hcmut.edu.vn','baok22','123123qwer');

-- PRINTER
INSERT INTO PRINTERS(PERMITTED_TYPE,BRAND,MODEL,DESCRIPTION,CAMPUS_NAME, BUILDING_NAME ,ROOM_NUMBER )
VALUE ('PNG','CANNON','PIXMA-TS9120','Great for photos and home use.','DI AN','H6',607);

INSERT INTO PRINTERS(PERMITTED_TYPE,BRAND,MODEL,DESCRIPTION,CAMPUS_NAME, BUILDING_NAME ,ROOM_NUMBER )
VALUE ('PDF','HP','DeskJet-3755','Compact, affordable for home use','DI AN','H6',604);

INSERT INTO PRINTERS(PERMITTED_TYPE,BRAND,MODEL,DESCRIPTION,CAMPUS_NAME, BUILDING_NAME ,ROOM_NUMBER )
VALUE ('PDF','Epson ','EcoTank-4760','Known for cost-saving refillable ink tanks.','DI AN','H6',101);

INSERT INTO PRINTERS(PERMITTED_TYPE,BRAND,MODEL,DESCRIPTION,CAMPUS_NAME, BUILDING_NAME ,ROOM_NUMBER )
VALUE ('PDF','Lexmark ','B-2236dw','Budget-friendly monochrome laser printers.','DI AN','H6',609);

-- FILE

INSERT INTO FILES(STUDENT_ID,FILE_NAME,FILE_TYPE)
VALUE('2211101','protect Gotham City.pdf','PDF');

INSERT INTO FILES(STUDENT_ID,FILE_NAME,FILE_TYPE)
VALUE('2211101','fight injustice.pdf','PDF');

INSERT INTO FILES(STUDENT_ID,FILE_NAME,FILE_TYPE)
VALUE('2211102','chaos and anarchy.pdf','PDF');

INSERT INTO FILES(STUDENT_ID,FILE_NAME,FILE_TYPE)
VALUE('2211102','destroy Batman sense of justice.pdf','PDF');

INSERT INTO FILES(STUDENT_ID,FILE_NAME,FILE_TYPE)
VALUE('2211106','Fighting for justice.pdf','PDF');

INSERT INTO FILES(STUDENT_ID,FILE_NAME,FILE_TYPE)
VALUE('2211106','Balancing his life as Peter Parker and Spider-Man.pdf','PDF');

--PAYMENTS 

CALL BUY_MORE_PAGES('2211101',50);
CALL BUY_MORE_PAGES('2211102',100);
CALL BUY_MORE_PAGES('2211102',20);
CALL BUY_MORE_PAGES('2211106',80);


-- LOGS 
/* 
  studentId : CHAR(7),
  printerId : INT,
  fileId : INT,
  doubleSize : BOOLEAN (value is INT 0 is false, >0 is true),
  pageSize : INT (value stand for pagesize. example: 4 : A4 , 3  : A3 ,... ),
  numOfCopies : INT,
  pagetoPrinted : VARCHAR(100) (A string, which is separated by comma. example: '1,3,5,7,9' )
*/

CALL INSERT_LOG('2211101',1,1,1,4,0,'1,3,5');
CALL INSERT_LOG('2211101',2,2,1,4,0,'2,4,6');
CALL INSERT_LOG('2211102',3,3,1,3,0,'1,2,3,4');
CALL INSERT_LOG('2211106',4,6,0,4,0,'11,13,15');


SELECT * FROM STUDENTS;
SELECT * FROM FILES;
SELECT * FROM PRINTERS;
SELECT * FROM LOGS;
SELECT * FROM PAYMENTS;