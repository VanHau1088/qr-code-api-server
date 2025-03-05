import jwt from "jsonwebtoken"
import User from "../models/userModel.js"

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "No authentication token, access denied" })
    }

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET)

    // Find user
    const user = await User.findById(verified.id)

    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    // Add user to request
    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ message: "Invalid token" })
  }
}

export default auth

