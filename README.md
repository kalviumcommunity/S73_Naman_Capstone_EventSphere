# S73_Naman_Capstone_EventSphere

## EventSphere - Local Event Discovery Platform
## **Problem Statement** 

Many individuals miss out on local events due to a lack of awareness. This project aims to develop a web-based platform that enables users to discover, explore, and bookmark local events based on their interests and location.

**Proposed Solution**
A user-friendly web application that allows users to efficiently find and save local events. The platform will include the following core features:

**Key Features**

- User Authentication: Secure sign-up, login, and logout functionality.
- Event Listing: Browse events based on categories and location filters.
- Event Details: View comprehensive information about each event.
- Bookmarking: Save events for future reference.
- Search and Filtering: Search events by keywords, date, or category.

**Technology Stack**

- Backend: Node.js with Express.js (REST API)
- Database: MongoDB (NoSQL)
- Frontend: React.js (Component-based UI)
- Authentication: JWT-based authentication
- Deployment:
  - Backend: Heroku
  - Frontend: Netlify
- Testing:
  - Backend: Jest
  - Frontend: React Testing Library


## Development Roadmap
**Phase 1: Requirement Analysi**s
- Define core functionalities and user flow.
- Identify technical and non-technical requirements.
- 
**Phase 2: System Design**
- Design wireframes for key pages:
  - Login & Signup
  - Event Listings & Details
  - Bookmark Management
- Define database schema for **Users, Events, and Bookmarks**.

**Phase 3: Backend Development**
- Set up the server with Node.js and Express.js.
- Implement JWT-based authentication.
- Develop CRUD operations for managing events and bookmarks.
- Integrate location-based filtering for event discovery.

**Phase 4: Frontend Development**
- Build the UI using React.js.
- Develop reusable components for various pages.
- Integrate frontend with backend APIs.

**Phase 5: Testing**
- Write unit tests for backend endpoints using Jest.
- Perform component testing using React Testing Library.

**Phase 6: Deployment & Maintenance**
- Deploy backend services on Heroku.
- Deploy frontend on Netlify.
- Monitor and optimize performance for scalability.


**Week 1 - Backend & Authentication (10 hrs)**

**Day 1: Requirement Analysis & Project Setup** 

✅ (2 hrs) Define core features, user flow, API endpoints, and database schema.

**Day 2: Backend Setup & Authentication**

✅ (2 hrs) Initialize Node.js project, set up Express.js & MongoDB, configure JWT authentication.

**Day 3: Event Schema & CRUD Operations**

✅ (2 hrs) Define Event schema and implement Create & Read APIs.

**Day 4: Event Management & Validation**

✅ (2 hrs) Implement Update & Delete event APIs with validation (Joi/Zod).

**Day 5: Bookmark & Search Features**

✅ (2 hrs) Develop bookmark system and search/filter API (keyword, category, date).
