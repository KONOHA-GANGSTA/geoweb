const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool({
  user: "pilig",
  host: "localhost",
  database: "geoweb",
  password: "aa205",
  port: 5432,
});

const createUser = async (username, password, full_name) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const creatingRole = await pool.query(
      `CREATE ROLE ${username} WITH LOGIN PASSWORD '${password}' SUPERUSER`
    );
    console.log("User created:", creatingRole.rows[0]);

    const result = await pool.query(
      "INSERT INTO users (username, password,full_name) VALUES ($1, $2, $3) RETURNING *",
      [username, hashedPassword, full_name]
    );
    console.log("User INSERTED:", result.rows[0]);
  } catch (error) {
    console.error("Error creating user:", error);
  }
};

createUser(process.argv[2], process.argv[3], process.argv[4]);
