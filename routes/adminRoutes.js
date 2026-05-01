import express from "express";
import { protectAdmin } from "../middleware/auth.js";

import { 
  getAllBookings, 
  getAllShows, 
  getDashboardData, 
  isAdmin,
  deleteShow
} from "../controllers/adminController.js";

const adminRouter = express.Router();

// ✅ Check admin
adminRouter.get('/is-admin', protectAdmin, isAdmin);

// ✅ Dashboard data
adminRouter.get('/dashboard', protectAdmin, getDashboardData);

// ✅ Get all shows
adminRouter.get('/all-shows', protectAdmin, getAllShows);

// ✅ Get all bookings
adminRouter.get('/all-bookings', protectAdmin, getAllBookings);

// 🔥 DELETE SHOW (NEW FEATURE)
adminRouter.delete('/delete-show/:id', protectAdmin, deleteShow);

export default adminRouter;