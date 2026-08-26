const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");
const winston = require("winston");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/club-management-app",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Configure Winston Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]")
);

// Custom API Logger Middleware
const apiLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      params: req.params,
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined,
    });
  });
  next();
};

app.use(apiLogger);

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.method !== "GET" ? req.body : undefined,
  });

  res.status(500).json({ message: "Internal server error" });
});

// Member Model
const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      required: true,
      enum: [
        "President",
        "Vice President",
        "Secretary",
        "Treasurer",
        "Event Coordinator",
        "Member",
      ],
      default: "Member",
    },
    department: {
      type: String,
      required: true,
    },
    joinDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const Member = mongoose.model("Member", memberSchema);

// Event Model
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Workshop", "Seminar", "Competition", "Cultural", "Social", "Sports", "Other"],
      default: "Workshop",
    },
    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled"],
      default: "upcoming",
    },
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model("Event", eventSchema);

// Member Routes
app.get("/api/members", async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    logger.info(`Retrieved ${members.length} members successfully`);
    res.json(members);
  } catch (error) {
    logger.error("Error fetching members:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/members", async (req, res) => {
  try {
    const member = new Member(req.body);
    const savedMember = await member.save();
    logger.info("New member created:", {
      memberId: savedMember._id,
      name: savedMember.name,
    });
    res.status(201).json(savedMember);
  } catch (error) {
    logger.error("Error creating member:", error);
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/members/search", async (req, res) => {
  try {
    const searchTerm = req.query.q;
    logger.info("Member search initiated:", { searchTerm });

    const members = await Member.find({
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { role: { $regex: searchTerm, $options: "i" } },
        { department: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ],
    });

    logger.info("Member search completed:", {
      searchTerm,
      resultsCount: members.length,
    });
    res.json(members);
  } catch (error) {
    logger.error("Error searching members:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/members/:id", async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    res.json(member);
  } catch (error) {
    logger.error("Error fetching member:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/members/:id", async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!member) {
      logger.warn("Member not found for update:", { memberId: req.params.id });
      return res.status(404).json({ message: "Member not found" });
    }
    logger.info("Member updated successfully:", {
      memberId: member._id,
      name: member.name,
    });
    res.json(member);
  } catch (error) {
    logger.error("Error updating member:", error);
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/members/:id", async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      logger.warn("Member not found for deletion:", {
        memberId: req.params.id,
      });
      return res.status(404).json({ message: "Member not found" });
    }
    logger.info("Member deleted successfully:", {
      memberId: member._id,
      name: member.name,
    });
    res.json({ message: "Member deleted successfully" });
  } catch (error) {
    logger.error("Error deleting member:", error);
    res.status(500).json({ message: error.message });
  }
});

// Event Routes
app.get("/api/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    logger.info(`Retrieved ${events.length} events successfully`);
    res.json(events);
  } catch (error) {
    logger.error("Error fetching events:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/events", async (req, res) => {
  try {
    const event = new Event(req.body);
    const savedEvent = await event.save();
    logger.info("New event created:", {
      eventId: savedEvent._id,
      title: savedEvent.title,
    });
    res.status(201).json(savedEvent);
  } catch (error) {
    logger.error("Error creating event:", error);
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    logger.error("Error fetching event:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) {
      logger.warn("Event not found for update:", { eventId: req.params.id });
      return res.status(404).json({ message: "Event not found" });
    }
    logger.info("Event updated successfully:", {
      eventId: event._id,
      title: event.title,
    });
    res.json(event);
  } catch (error) {
    logger.error("Error updating event:", error);
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      logger.warn("Event not found for deletion:", { eventId: req.params.id });
      return res.status(404).json({ message: "Event not found" });
    }
    logger.info("Event deleted successfully:", {
      eventId: event._id,
      title: event.title,
    });
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    logger.error("Error deleting event:", error);
    res.status(500).json({ message: error.message });
  }
});

// Dashboard Stats
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const stats = await getDashboardStats();
    logger.info("Dashboard statistics retrieved successfully:", stats);
    res.json(stats);
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: error.message });
  }
});

// Helper function for dashboard stats
async function getDashboardStats() {
  const totalMembers = await Member.countDocuments();
  const activeMembers = await Member.countDocuments({ status: "active" });
  const totalEvents = await Event.countDocuments();
  const upcomingEvents = await Event.countDocuments({ status: "upcoming" });
  const completedEvents = await Event.countDocuments({ status: "completed" });
  const roleCounts = await Member.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);

  return {
    totalMembers,
    activeMembers,
    totalEvents,
    upcomingEvents,
    completedEvents,
    roleCounts,
    completionRate:
      totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0,
  };
}

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Detailed health check endpoint with MongoDB connection status
app.get("/health/detailed", async (req, res) => {
  try {
    const dbStatus =
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

    const systemInfo = {
      memory: {
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        unit: "MB",
      },
      uptime: {
        seconds: Math.round(process.uptime()),
        formatted: formatUptime(process.uptime()),
      },
      nodeVersion: process.version,
      platform: process.platform,
    };

    const healthCheck = {
      status: "UP",
      timestamp: new Date(),
      database: {
        status: dbStatus,
        name: "MongoDB",
        host: mongoose.connection.host,
      },
      system: systemInfo,
      environment: process.env.NODE_ENV || "development",
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: "DOWN",
      timestamp: new Date(),
      error: error.message,
    });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

  return parts.join(" ");
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
