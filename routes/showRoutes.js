import express from "express";
import {
  addShow,
  getNowPlayingMovies,
  getShow,
  getShows,
  deleteShow, // ✅ added
} from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter = express.Router();

// ✅ Public route (needed for admin movie list)
showRouter.get("/now-playing", getNowPlayingMovies);

// 🔒 Admin: Add show
showRouter.post("/add", protectAdmin, addShow);

// 🔒 Admin: Delete show (NEW)
showRouter.delete("/:id", protectAdmin, deleteShow);

// ✅ Public: Get all shows (frontend)
showRouter.get("/all", getShows);

// ✅ Public: Get single movie show details
showRouter.get("/:movieId", getShow);

export default showRouter;