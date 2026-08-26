# Club Management Dashboard

Same stack as the Student Management app: Node.js + Express + Mongoose (MongoDB) on the backend, a single-page vanilla HTML/CSS/JS dashboard on the frontend.

## What it does

Handles the two things a university club usually has to track:

- **Members** — name, email, club role (President, Vice President, Secretary, Treasurer, Event Coordinator, Member), department, join date, active/inactive status. Search by name, role, department, or email.
- **Events** — title, description, category (Workshop, Seminar, Competition, Cultural, Social, Sports, Other), date, venue, status (upcoming/completed/cancelled).

Dashboard shows total members, upcoming events, completed events, and a completion rate, plus a recent-members table.

## Run it

**Backend**
```
cd Backend
npm install
npm run dev      # or: npm start
```
Set `MONGODB_URI` in a `.env` file if you're not using local MongoDB (defaults to `mongodb://localhost:27017/club-management-app`). Server runs on port 3000 by default.

**Frontend**
Just open `Frontend/index.html` in a browser (or serve it with any static server). It talks to the backend at `http://localhost:3000`.

## API

- `GET/POST /api/members`, `GET/PUT/DELETE /api/members/:id`, `GET /api/members/search?q=`
- `GET/POST /api/events`, `GET/PUT/DELETE /api/events/:id`
- `GET /api/dashboard/stats`
- `GET /health`, `GET /health/detailed`
