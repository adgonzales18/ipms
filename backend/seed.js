import bcrypt from "bcrypt";
import User from "./models/User.js";
import connectDB from "./db/connection.js";

const seedUsers = async () => {
  try {
    await connectDB();

    const users = [
      {
        name: "Admin User",
        email: "admin@example.com",
        password: "admin12345",
        address: "Head Office",
        role: "admin",
      },
      {
        name: "Regular User",
        email: "user@example.com",
        password: "user12345",
        address: "Main Branch",
        role: "user",
      },
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        console.log(`⚠️ User with email ${userData.email} already exists`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = new User({
        ...userData,
        password: hashedPassword,
      });

      await newUser.save();
      console.log(`✅ Created ${userData.role} user: ${userData.email}`);
    }
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  } finally {
    process.exit();
  }
};

seedUsers();
