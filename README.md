# WealthWise

WealthWise is a comprehensive Mutual Fund Investment Tracker prototype application. It consists of a modern React frontend (powered by Vite) and a robust Spring Boot backend (powered by Java). 

This guide provides step-by-step instructions on how to set up, configure, and run both the frontend and backend locally.

---

## 🏗️ Project Architecture
The project is divided into two main components:
1. **`frontend/`**: The client-side React application built with Vite.
2. **`wealthwise-backend/`**: The server-side Spring Boot API providing authentication, investment management, and secure data handling.

---

## 🛠️ Prerequisites
Before you begin, ensure you have the following installed on your machine:
* **Node.js** (v18 or higher) - For running the frontend.
* **Java Development Kit (JDK) 21** - For compiling and running the Spring Boot backend.
* **Maven** - For managing backend dependencies.
* **MySQL Server** - For the backend database.

---

## 💻 1. Backend Setup (Spring Boot)

The backend handles core business logic, user authentication (with JWT & BCrypt password hashing), OTP verification via email, and investment tracking.

### Dependencies Overview (Maven)
The backend uses dependencies explicitly defined in `pom.xml`, including:
- Spring Boot Starter Web (REST APIs)
- Spring Boot Starter Data JPA (Database mapping)
- Spring Boot Starter Security (Crypto for BCrypt)
- Spring Boot Starter Mail (OTP Emails)
- MySQL Connector/J (Database Driver)
- JJWT (JSON Web Token generation & validation)
- Lombok

### Step-by-Step Setup
1. **Open the Backend Directory:**
   ```bash
   cd wealthwise-backend
   ```

2. **Database Configuration:**
   Create a MySQL Database named `wealthwise` (or whatever you configured your database name to be).
   ```sql
   CREATE DATABASE wealthwise;
   ```
   *Make sure your `src/main/resources/application.properties` (or `.yml`) includes the correct MySQL credentials (username and password) and Email SMTP configuration for sending OTPs.*

3. **Install Dependencies:**
   Maven will automatically download dependencies when you build or run the application. To force an install:
   ```bash
   mvn clean install
   ```

4. **Run the Backend:**
   You can run the application directly using the Maven wrapper or from your IDE (like VS Code, IntelliJ IDEA, or Eclipse) by running the main class.
   ```bash
   mvn spring-boot:run
   ```
   *The backend will typically start on `http://localhost:8088` (or port `8080` depending on your configurations).*

---

## 🎨 2. Frontend Setup (React + Vite)

The frontend provides an intuitive UI for users to register, securely log in, verify OTPs, and manage investments.

### Dependencies Overview (NPM)
The frontend uses standard NPM packages, primarily:
- `react` & `react-dom` - Core UI rendering
- `axios` - For HTTP networking (fetching API data)
- `react-icons` - For UI iconography (like the password visibility toggle)

### Step-by-Step Setup
1. **Open the Frontend Directory:**
   ```bash
   cd frontend
   ```

2. **Install Dependencies:**
   Install all necessary Node modules defined in `package.json`.
   ```bash
   npm install
   ```

3. **Run the Development Server:**
   Start the Vite dev server to view the application locally.
   ```bash
   npm run dev
   ```

4. **View the Application:**
   Open your browser and navigate to the Local URL provided in the terminal (usually `http://localhost:5173`).

---

## 🔐 Security & Integrations Features Implemented
* **Modern Authentication Flow:** Interactive layout covering Signup, Sign In, and Forgot Password features.
* **JWT Token Security:** The backend leverages standard JWT Tokens natively validated and distributed using standard encryption techniques.
* **Database Hashing:** User passwords are encrypted globally inside the backend using `BCryptPasswordEncoder` to safely secure database entries natively.
* **Dynamic Modals:** Responsive and engaging user interface using Vanilla CSS configurations for glassmorphism styling parameters.
* **Password Toggles:** Implemented native Eye toggle icons mapping input visibility types.
