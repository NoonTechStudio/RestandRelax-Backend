// controllers/DashboardController.js
import Booking from "../models/Booking.js";
import Location from "../models/Location.js";
import Review from "../models/Review.js";

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get total bookings count
    const totalBookings = await Booking.countDocuments();
    
    // Get monthly bookings
    const monthlyBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Get yearly bookings
    const yearlyBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfYear }
    });

    // Get revenue statistics
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricing.totalPrice" },
          averageBookingValue: { $avg: "$pricing.totalPrice" }
        }
      }
    ]);

    // Get location statistics
    const locationStats = await Location.aggregate([
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "location",
          as: "bookings"
        }
      },
      {
        $project: {
          name: 1,
          totalBookings: { $size: "$bookings" },
          isActive: 1
        }
      },
      {
        $sort: { totalBookings: -1 }
      }
    ]);

    // Get booking status distribution
    const bookingStatus = await Booking.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent reviews with ratings
    const recentReviews = await Review.find()
      .populate('location', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate occupancy rate (simplified)
    const totalLocations = await Location.countDocuments({ isActive: true });
    const bookedLocations = await Booking.distinct("location", {
      checkInDate: { $lte: today },
      checkOutDate: { $gte: today }
    });

    const occupancyRate = totalLocations > 0 
      ? (bookedLocations.length / totalLocations) * 100 
      : 0;

    res.json({
      success: true,
      stats: {
        overview: {
          totalBookings,
          monthlyBookings,
          yearlyBookings,
          totalLocations: await Location.countDocuments({ isActive: true }),
          occupancyRate: Math.round(occupancyRate)
        },
        financial: revenueStats[0] || { totalRevenue: 0, averageBookingValue: 0 },
        locations: locationStats,
        bookingStatus,
        recentReviews,
        occupancy: {
          current: bookedLocations.length,
          total: totalLocations,
          rate: Math.round(occupancyRate)
        }
      }
    });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const recentBookings = await Booking.find()
      .populate('location', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name phone checkInDate checkOutDate pricing.totalPrice paymentType remainingAmount amountPaid paymentStatus');

    const recentReviews = await Review.find()
      .populate('location', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('guestName rating title createdAt location');

    res.json({
      success: true,
      recentActivity: {
        bookings: recentBookings,
        reviews: recentReviews
      }
    });

  } catch (err) {
    console.error("Recent activity error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};