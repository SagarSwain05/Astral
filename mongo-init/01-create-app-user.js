// MongoDB init script — automatically executed on first launch.
// Creates a dedicated application user with read/write privileges
// on the astral_neo database (instead of using the root account).

db = db.getSiblingDB("astral_neo");

db.createUser({
  user: "astral_app",
  pwd: "astral_app_pass_2024",
  roles: [{ role: "readWrite", db: "astral_neo" }],
});

print("✅ Created astral_app user for astral_neo database");
