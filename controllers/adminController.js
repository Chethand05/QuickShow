import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";


// ✅ Check admin
export const isAdmin = async (req, res) => {
    res.json({ success: true, isAdmin: true });
};


// ✅ Dashboard (FIXED)
export const getDashboardData = async (req, res) => {
    try {
        // 🔥 FIX: Ignore deleted shows using lookup
        const bookingStats = await Booking.aggregate([
            {
                $lookup: {
                    from: "shows",
                    localField: "show",
                    foreignField: "_id",
                    as: "showData"
                }
            },
            { $unwind: "$showData" }, // removes bookings with deleted show
            { $match: { isPaid: true } },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    totalRevenue: { $sum: "$amount" }
                }
            }
        ]);

        const activeShows = await Show.find({
            showDateTime: { $gte: new Date() }
        })
        .populate("movie")
        .lean()
        .limit(10)
        .sort({ showDateTime: 1 });

        const totalUser = await User.countDocuments();

        const dashboardData = {
            totalBookings: bookingStats[0]?.totalBookings || 0,
            totalRevenue: bookingStats[0]?.totalRevenue || 0,
            activeShows,
            totalUser
        };

        res.json({ success: true, dashboardData });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};


// ✅ Get all shows
export const getAllShows = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const shows = await Show.find({
            showDateTime: { $gte: new Date() }
        })
        .populate("movie")
        .sort({ showDateTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

        const total = await Show.countDocuments({
            showDateTime: { $gte: new Date() }
        });

        res.json({
            success: true,
            shows,
            total,
            page,
            pages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};


// ✅ Get all bookings (FIXED)
export const getAllBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const bookings = await Booking.find({})
        .populate({
            path: "show",
            populate: { path: "movie" }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

        // 🔥 FIX: Remove bookings where show is deleted
        const validBookings = bookings.filter(b => b.show !== null);

        // Get users only from valid bookings
        const userIds = [...new Set(validBookings.map(b => b.user))];

        const userMap = {};
        for (let i = 0; i < userIds.length; i += 100) {
            const batch = userIds.slice(i, i + 100);

            const users = await Promise.all(
                batch.map(id =>
                    clerkClient.users.getUser(id).catch(() => ({
                        id,
                        firstName: "Unknown",
                        lastName: "User"
                    }))
                )
            );

            users.forEach(user => {
                userMap[user.id] = {
                    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User",
                    email: user.emailAddresses?.[0]?.emailAddress || ""
                };
            });
        }

        // Attach user data
        const bookingsWithUser = validBookings.map(booking => ({
            ...booking,
            user: userMap[booking.user] || {
                name: "Unknown User",
                email: ""
            }
        }));

        const total = validBookings.length;

        res.json({
            success: true,
            bookings: bookingsWithUser,
            total,
            page,
            pages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};


// ✅ DELETE SHOW (MAIN FIX 🔥)
export const deleteShow = async (req, res) => {
    try {
        const { id } = req.params;

        const show = await Show.findById(id);

        if (!show) {
            return res.json({
                success: false,
                message: "Show not found"
            });
        }

        // delete show
        await Show.findByIdAndDelete(id);

        // 🔥 CRITICAL FIX: delete related bookings
        await Booking.deleteMany({ show: id });

        res.json({
            success: true,
            message: "Show and related bookings deleted"
        });

    } catch (error) {
        console.error(error);
        res.json({
            success: false,
            message: error.message
        });
    }
};