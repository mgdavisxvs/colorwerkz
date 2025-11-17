# ColorWerkz Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This document provides a detailed specification of the requirements for the ColorWerkz system. It is intended for developers, project managers, and testers to understand the full scope of the project, including functional and non-functional requirements. The primary goal is to guide the redevelopment and enhancement of the ColorWerkz application, ensuring all architectural and functional aspects are clearly defined.

### 1.2 Scope
This SRS covers the entire ColorWerkz application, a web-based platform for the manufacturing industry. The scope includes:
- Core calculation engine for color combinations.
- AI-powered image analysis and color transfer.
- Advanced model training and management system.
- User management, authentication, and authorization.
- Database schema and data management.
- API specifications for internal and external use.
- Infrastructure, deployment, and security requirements.

The document outlines the phased migration plan, including immediate security fixes, algorithm migration, route consolidation, schema modularization, and the transition to a Python-based microservice architecture.

### 1.3 Definitions, Acronyms, Abbreviations
- **AI**: Artificial Intelligence
- **API**: Application Programming Interface
- **CLI**: Command Line Interface
- **Concurrent User**: A user with an active session who has made at least one API request within the last 5 minutes. Used for load testing and capacity planning (see NFR-004).
- **CSRF**: Cross-Site Request Forgery
- **CVE**: Common Vulnerabilities and Exposures
- **Delta E (ΔE)**: A metric for understanding how the human eye perceives color difference.
- **E2E**: End-to-End
- **FR**: Functional Requirement
- **GUI**: Graphical User Interface
- **HTTP**: Hypertext Transfer Protocol
- **IEEE**: Institute of Electrical and Electronics Engineers
- **JSON**: JavaScript Object Notation
- **JWT**: JSON Web Token
- **ML**: Machine Learning
- **NFR**: Non-Functional Requirement
- **ORM**: Object-Relational Mapping
- **Real-time Processing**: Refers to operations that must return a response within a strict time ceiling. For this system, specific latencies are defined in the NFRs (e.g., NFR-001, NFR-005).
- **RSR**: Refactoring & System Migration Report
- **SaaS**: Software as a Service
- **SRS**: Software Requirements Specification
- **UI**: User Interface
- **UX**: User Experience

### 1.4 References
- ColorWerkz_RSR_Complete.md
- DESIGN_DOCUMENT.md
- FEATURE_ROADMAP.md
- MODEL_TRAINING_SPECIFICATION.md
- All RSR Task documents (Task2 to Task6)

### 1.5 Overview
This document is organized into seven main sections. Section 1 provides an introduction. Section 2 gives an overall description of the product. Section 3 details the specific functional requirements. Section 4 describes external interface requirements. Section 5 outlines the non-functional requirements. Section 6 specifies the data requirements. Section 7 contains appendices with supplementary information.

## 2. Overall Description

### 2.1 Product Perspective
ColorWerkz is an AI-powered manufacturing intelligence system designed to achieve ≤2.0 Delta E color accuracy for RAL color transfer across over 200 furniture product variants. It is a full-stack web application with a React frontend, a Node.js/Express backend, and a Python-based AI processing layer. The system is designed to be deployed on a scalable infrastructure, with a PostgreSQL database for data persistence.

### 2.2 Product Functions
The major functions of the ColorWerkz system are:
- **Color Combination Engine:** Real-time calculation and visualization of over 1.2 million color combinations.
- **AI-Powered Image Analysis:** Advanced image processing for color detection, segmentation, and transfer.
- **Advanced Training System:** A comprehensive pipeline for training, validating, and deploying custom AI models.
- **User Management & Security:** A robust RBAC system with multi-factor authentication and audit logging.
- **Backup & Recovery:** Automated daily backups with point-in-time recovery.
- **Analytics Dashboard:** Real-time monitoring of user activity, system performance, and business metrics.

### 2.3 User Classes and Characteristics
- **Admin:** Full access to all system features, including user management, system configuration, and security settings.
- **Manager:** Can manage users and projects, but cannot change system-level configurations.
- **User:** Can create and edit projects, run analyses, and train models.
- **Viewer:** Read-only access to projects and results.

### 2.4 Operating Environment
- **Frontend:** Modern web browser with JavaScript enabled.
- **Backend:** Node.js 20.x LTS environment.
- **AI Processing:** Python environment with PyTorch, OpenCV, and other specified ML libraries. GPU is required for efficient model training.
- **Database:** PostgreSQL 15+.
- **Deployment:** The system is designed for containerized deployment (Docker) and can be orchestrated with Kubernetes.

### 2.5 Design and Implementation Constraints
- The system must be migrated from its current state of high technical debt to a modular, maintainable, and scalable architecture.
- All security vulnerabilities, especially command injection, must be remediated immediately.
- The OpenCV baseline algorithm for color transfer is to be deprecated for production use and replaced by a trained PyTorch U-Net model.
- The monolithic database schema must be modularized into domain-specific schemas.
- The Python-TypeScript integration must be transitioned from shell invocations to a dedicated Python service.

### 2.6 Assumptions and Dependencies
- A GPU environment (like Google Colab Pro with a Tesla V100) is available for model training.
- The user base has a technical background in manufacturing and design.
- The system will be deployed in an environment that allows for the setup of a separate Python service.

## 3. System Features (Detailed Functional Requirements)

### 3.1 User Management & Permissions
- **FR-001:** The system shall provide a Role-Based Access Control (RBAC) system.
- **FR-002:** The system shall have four default roles: `Admin`, `Manager`, `User`, and `Viewer`.
- **FR-003:** `Admin` users shall have the ability to create, read, update, and delete any user or project.
- **FR-004:** `Manager` users shall have the ability to manage users within their assigned projects.
- **FR-005:** `User` users shall have the ability to create and manage their own projects.
- **FR-006:** `Viewer` users shall have read-only access to projects they are assigned to.
- **FR-007:** The system shall support authentication via email/password and Google OAuth 2.0.

### 3.2 Backup & Recovery System
- **FR-008:** The system shall perform automated daily backups of the PostgreSQL database.
- **FR-009:** Backups shall be retained for a rolling 30-day window.
- **FR-010:** The system shall support point-in-time recovery to any checkpoint within the last 30 days.
- **FR-011:** A disaster recovery plan shall be in place to ensure an RTO of < 1 hour and an RPO of < 15 minutes.

### 3.3 Production Deployment System
- **FR-012:** The application shall be containerized using Docker.
- **FR-013:** The system shall be deployable with a single command.
- **FR-014:** The deployment system shall support automatic scaling based on load.
- **FR-015:** A CI/CD pipeline shall be implemented to automate linting, testing, building, and deployment.

### 3.4 Advanced Segmentation Training
- **FR-016:** The system shall provide an auto-labeling system for new images to facilitate training data creation.
- **FR-017:** A semi-supervised learning pipeline shall be implemented to leverage both labeled and unlabeled data.
- **FR-018:** The system shall use a custom U-Net with attention mechanisms for segmentation tasks.
- **FR-019:** The training system shall support transfer learning from pre-trained models.

### 3.5 Real-time Collaboration
- **FR-020:** The system shall use WebSockets to provide real-time updates for collaborative sessions.
- **FR-021:** Multiple users shall be able to work on the same project simultaneously.
- **FR-022:** The system shall provide live cursor tracking and collaborative annotations.

### 3.6 API Documentation & SDK
- **FR-023:** The system shall provide comprehensive RESTful API documentation.
- **FR-024:** An OpenAPI/Swagger specification shall be generated for the API.
- **FR-025:** Client SDKs for JavaScript and Python shall be provided.

### 3.7 Manufacturing Integration
- **FR-026:** The system shall provide connectors for common ERP systems.
- **FR-027:** The system shall be able to generate production orders based on color combinations.

### 3.8 Advanced Analytics Dashboard
- **FR-028:** The dashboard shall visualize usage statistics and trends.
- **FR-029:** The dashboard shall display real-time performance metrics (CPU, memory, response times).
- **FR-030:** The dashboard shall provide insights into user behavior and feature adoption.

### 3.9 Color Transfer Algorithm
- **FR-031:** The system shall replace the current OpenCV-based color transfer algorithm with a PyTorch U-Net model.
- **FR-032:** The PyTorch U-Net model must be trained to achieve a Delta E of <2.0 on 95%+ of the validation set.
- **FR-033:** The pseudo-label generation bug in `synthetic_ral_dataset.py` must be fixed to ensure correct model training.
- **FR-034:** The system shall provide a unified color transfer API endpoint that accepts a `method` parameter to select the algorithm (`opencv`, `pytorch`, `i2i`).

### 3.10 Route Consolidation
- **FR-035:** The 46 existing route files shall be consolidated into 21 route modules (12 core + 9 infrastructure).
- **FR-036:** All "enhanced" routes shall be merged into their base counterparts, using API versioning to manage changes.
- **FR-037:** Technology-specific routes (e.g., `opencv-baseline.ts`) shall be removed in favor of a unified endpoint with a method parameter.

### 3.11 Schema Modularization
- **FR-038:** The monolithic `shared/schema.ts` file shall be split into 17 domain-specific schema modules.
- **FR-039:** A central `index.ts` file shall be created in `shared/schemas/` to re-export all modules for backward compatibility.
- **FR-040:** All imports from `@shared/schema` shall be updated to import from the specific domain modules (e.g., `@shared/schemas/auth`).

### 3.12 Python-TypeScript Integration
- **FR-041:** All shell invocations of Python scripts shall be replaced with a secure method, such as `spawn` with an argument array.
- **FR-042:** The system shall migrate to a long-running Python service (e.g., using FastAPI) for handling AI/ML tasks.
- **FR-043:** The Node.js backend shall communicate with the Python service via a well-defined API (HTTP/gRPC).

## 4. External Interface Requirements

### 4.1 User Interfaces
- The UI shall be modern, responsive, and accessible, following the design system specified in `DESIGN_DOCUMENT.md`.
- The UI shall be built with React, TypeScript, and Tailwind CSS.
- All components shall adhere to WCAG 2.1 AA accessibility standards.

### 4.2 Software Interfaces
- The system shall interface with a PostgreSQL database.
- The system shall integrate with Google OAuth 2.0 for authentication.
- The Node.js backend shall communicate with the Python service via an internal HTTP/gRPC API.

## 5. Non-Functional Requirements

### 5.1 Performance Requirements
- **NFR-001:** API response time shall be < 100ms (p95).
- **NFR-002:** Page load time shall be < 2 seconds.
- **NFR-003:** The system shall support at least 10,000 concurrent users.
- **NFR-004:** The color transfer operation shall have a latency of < 0.3s (p50) after migration to the Python service.
- **NFR-005:** TypeScript rebuild time shall be < 0.5 seconds.
- **NFR-006:** Frontend bundle size for domain-specific pages shall be reduced by at least 80%.

### 5.2 Security Requirements
- **NFR-007:** All command injection vulnerabilities must be eliminated.
- **NFR-008:** The system shall be protected against CSRF, XSS, and SQL injection attacks.
- **NFR-009:** Data shall be encrypted at rest (AES-256) and in transit (TLS 1.3).
- **NFR-010:** All passwords shall be hashed using bcrypt.
- **NFR-011:** Test stubs and other testing artifacts must not be present in production builds.
- **NFR-012:** The system shall include a Content Security Policy (CSP) and other security-related HTTP headers.

### 5.3 Reliability
- **NFR-013:** The system shall have a mean time between failures (MTBF) of at least 1000 hours.
- **NFR-014:** The system shall have a mean time to recovery (MTTR) of less than 30 minutes.

### 5.4 Availability
- **NFR-015:** The system shall have an uptime of 99.9%.

### 5.5 Scalability
- **NFR-016:** The system shall be able to scale horizontally to handle increased load.
- **NFR-017:** The database shall be partitionable for future growth.

### 5.6 Maintainability
- **NFR-018:** The codebase shall be modular, with clear separation of concerns.
- **NFR-019:** Code coverage shall be at least 80%.
- **NFR-020:** The number of route files shall be reduced from 46 to 21.
- **NFR-021:** The use of the `any` type in TypeScript shall be reduced by at least 65%.
- **NFR-022:** The system shall use a structured logger for all log messages.

## 6. Data Requirements

### 6.1 Logical Data Model
The database schema is currently a monolith and will be modularized into the following domains:
- Core (RAL colors, calculations)
- Auth (users, roles, sessions)
- Security (audit logs)
- Backup (backups, recovery points)
- Analytics (events, metrics)
- API Management (API keys, usage)
- Energy (costs, ledger, settings)
- AI Training (training runs, metrics)
- AI Testing (test sessions, results)
- AI Models (model architecture, artifacts)
- AI Evaluation (evaluation metrics)
- AI Analysis (analysis, docs)
- Site Analysis (site infrastructure)
- UX Features (UX, features, journeys)
- Metadata (general metadata)

### 6.2 Data Dictionary
A detailed data dictionary will be generated as part of the schema modularization process, documenting each table, column, data type, and constraint.

## 7. Appendices
(Appendices with detailed diagrams, API specifications, and other supporting artifacts will be generated as part of the full project documentation.)
