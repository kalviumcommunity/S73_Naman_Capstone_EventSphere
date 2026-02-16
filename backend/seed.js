const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Event = require("./models/Event");

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected for seeding...");

        // Create a demo user
        const existingUser = await User.findOne({ email: "demo@eventsphere.com" });
        let demoUser;

        if (existingUser) {
            demoUser = existingUser;
            console.log("Demo user already exists, using existing.");
        } else {
            demoUser = new User({
                name: "EventSphere Admin",
                email: "demo@eventsphere.com",
                password: "demo123456",
            });
            await demoUser.save();
            console.log("Demo user created: demo@eventsphere.com / demo123456");
        }

        // Sample events
        const events = [
            {
                name: "Indie Music Festival 2026",
                date: new Date("2026-03-15"),
                location: "Central Park, New York",
                description:
                    "A vibrant outdoor music festival featuring indie artists from across the country. Enjoy live performances, food trucks, and art installations in the heart of NYC.",
                category: "Music",
                createdBy: demoUser._id,
            },
            {
                name: "React & Node.js Conference",
                date: new Date("2026-03-22"),
                location: "Tech Hub Convention Center, San Francisco",
                description:
                    "Join 500+ developers for talks on React 19, Node.js performance, modern full-stack architecture, and hands-on workshops with industry experts.",
                category: "Tech",
                createdBy: demoUser._id,
            },
            {
                name: "City Marathon 2026",
                date: new Date("2026-04-05"),
                location: "Downtown, Chicago",
                description:
                    "Annual city marathon with 5K, 10K, and full marathon categories. Open to all fitness levels. Medals, refreshments, and live entertainment included.",
                category: "Sports",
                createdBy: demoUser._id,
            },
            {
                name: "Modern Art Exhibition",
                date: new Date("2026-03-28"),
                location: "Gallery District, Los Angeles",
                description:
                    "Explore contemporary art from 40+ emerging artists. Interactive installations, live painting sessions, and artist meet-and-greets throughout the weekend.",
                category: "Art",
                createdBy: demoUser._id,
            },
            {
                name: "Street Food Festival",
                date: new Date("2026-04-12"),
                location: "Riverside Park, Austin",
                description:
                    "Taste the best street food from 30+ local vendors. From tacos to Thai, BBQ to bubble tea — there's something for every palate. Live cooking demos included!",
                category: "Food",
                createdBy: demoUser._id,
            },
            {
                name: "Startup Pitch Night",
                date: new Date("2026-03-18"),
                location: "WeWork Downtown, Mumbai",
                description:
                    "Watch 10 early-stage startups pitch to a panel of VCs and angel investors. Network with founders, investors, and fellow entrepreneurs.",
                category: "Business",
                createdBy: demoUser._id,
            },
            {
                name: "Jazz Under the Stars",
                date: new Date("2026-04-20"),
                location: "Botanical Gardens, London",
                description:
                    "An enchanting evening of jazz music performed live in the beautiful botanical gardens. Bring a blanket and enjoy world-class musicians under the night sky.",
                category: "Music",
                createdBy: demoUser._id,
            },
            {
                name: "AI & Machine Learning Summit",
                date: new Date("2026-05-10"),
                location: "Convention Center, Bangalore",
                description:
                    "Deep dive into the latest AI breakthroughs — LLMs, computer vision, robotics, and ethical AI. Featuring keynotes from Google DeepMind and OpenAI researchers.",
                category: "Tech",
                createdBy: demoUser._id,
            },
            {
                name: "Basketball Championship Finals",
                date: new Date("2026-04-25"),
                location: "Sports Arena, Delhi",
                description:
                    "Watch the top college basketball teams compete for the championship title. High-energy atmosphere with cheering crowds, halftime shows, and player signings.",
                category: "Sports",
                createdBy: demoUser._id,
            },
            {
                name: "Wine & Cheese Tasting",
                date: new Date("2026-05-03"),
                location: "Heritage Vineyard, Pune",
                description:
                    "Sample premium wines paired with artisan cheeses from local producers. Guided tasting sessions and vineyard tours. Perfect for a weekend getaway.",
                category: "Food",
                createdBy: demoUser._id,
            },
            {
                name: "Photography Walkathon",
                date: new Date("2026-04-18"),
                location: "Old City, Jaipur",
                description:
                    "A guided photography walk through the colorful streets and historic architecture of Jaipur. Open to all skill levels. Bring your camera or phone!",
                category: "Art",
                createdBy: demoUser._id,
            },
            {
                name: "Entrepreneurship Bootcamp",
                date: new Date("2026-05-15"),
                location: "IIM Campus, Ahmedabad",
                description:
                    "A 2-day intensive bootcamp covering business model canvas, product-market fit, fundraising strategy, and go-to-market execution. Mentorship included.",
                category: "Business",
                createdBy: demoUser._id,
            },
        ];

        // Clear existing events (optional — remove this line if you want to keep existing events)
        await Event.deleteMany({});
        console.log("Cleared existing events.");

        // Insert events
        const inserted = await Event.insertMany(events);
        console.log(`✅ Successfully seeded ${inserted.length} events!`);
        console.log("\n--- Demo Login Credentials ---");
        console.log("Email:    demo@eventsphere.com");
        console.log("Password: demo123456");
        console.log("------------------------------\n");

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Seeding error:", error.message);
        process.exit(1);
    }
};

seedData();
