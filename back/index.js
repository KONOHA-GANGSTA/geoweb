require("dotenv").config();

const express = require("express");
const { Pool, Client } = require("pg");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT;
const secretKey = process.env.JWT_SECRET_KEY;
const DB_PARAMS = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const pool = new Pool(DB_PARAMS);

const corsOptions = {
  origin: true,
  credentials: true,
};
app.use(cors(corsOptions));

const fillNzeros = (str, N) => {
  if (N === 2) return "0" + str;
  if (N - str.length - 1 <= 0) return str;
  const arr = [];
  for (let i = 0; i <= N - str.length - 1; ++i) arr.push(0);
  return arr.join("") + str;
};

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }

  return next();
};

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).send("Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).send("Invalid credentials");
    }
    const token = jwt.sign(
      { id: user.id, username: user.full_name },
      secretKey,
      { expiresIn: "5h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 3600000 * 5,
    });
    res.send({ username: user.full_name });
    console.log("Login successful");
  } catch (error) {
    res.status(500).send("Server error");
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  console.log("Logout successful");
  res.send("Logout successful");
});

app.get("/check-auth", authMiddleware, (req, res) => {
  res.send({ authenticated: true, username: req.user.username });
});

app.get("/api/wells", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM well");
    const wells = result.rows;
    res.send(wells);
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/api/source_company", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT source FROM r_well_sftr_rle"
    );
    const companies = result.rows;
    res.send(companies.map((el) => el.source));
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/api/well_relation", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT r_well_sftr_rle_kd FROM r_well_sftr_rle"
    );
    const relations = result.rows;
    res.send(relations.map((el) => el.r_well_sftr_rle_kd));
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/api/fields", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM field");
    const fields = result.rows;
    res.send(fields);
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/api/well_alias", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM well_alias");
    const aliases = result.rows;
    res.send(aliases);
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/api/well_alias/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM well_alias WHERE well_S = $1",
      [id]
    );
    const aliases = result.rows;
    res.send(aliases);
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
});

app.get("/api/geolocation_points", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT wsp.well_surface_pt_s,wsp.well_s,wsp.well_surface_pt_id,pl1.data_value_1_o AS pl1_data_value_1_o,pl1.data_value_1_ou AS pl1_data_value_1_ou,pl1.data_value_cs AS pl1_data_value_cs,pl1.preferred_flag AS pl1_preferred_flag,pl2.data_value_1_o AS pl2_data_value_1_o,pl2.data_value_1_ou AS pl2_data_value_1_ou,pl2.data_value_2_o AS pl2_data_value_2_o,pl2.data_value_2_ou AS pl2_data_value_2_ou,pl2.data_value_cs AS pl2_data_value_cs,pl2.preferred_flag AS pl2_preferred_flag FROM well_surface_pt wsp INNER JOIN p_location_1d pl1 ON wsp.well_surface_pt_s = pl1.well_surface_pt_s INNER JOIN p_location_2d pl2 ON wsp.well_surface_pt_s = pl2.well_surface_pt_s"
    );
    const geopoints = result.rows;
    res.send(geopoints);
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.get("/api/geolocation_points/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT wsp.well_surface_pt_s,wsp.well_s,wsp.well_surface_pt_id,pl1.data_value_1_o AS pl1_data_value_1_o,pl1.data_value_1_ou AS pl1_data_value_1_ou,pl1.data_value_cs AS pl1_data_value_cs,pl1.preferred_flag AS pl1_preferred_flag,pl2.data_value_1_o AS pl2_data_value_1_o,pl2.data_value_1_ou AS pl2_data_value_1_ou,pl2.data_value_2_o AS pl2_data_value_2_o,pl2.data_value_2_ou AS pl2_data_value_2_ou,pl2.data_value_cs AS pl2_data_value_cs,pl2.preferred_flag AS pl2_preferred_flag FROM well_surface_pt wsp INNER JOIN p_location_1d pl1 ON wsp.well_surface_pt_s = pl1.well_surface_pt_s INNER JOIN p_location_2d pl2 ON wsp.well_surface_pt_s = pl2.well_surface_pt_s WHERE wsp.well_s = $1",
      [id]
    );
    const aliases = result.rows;
    res.send(aliases);
  } catch (error) {
    console.log("ERROR GEOLOC ID");
    res.status(500).send("Server Error");
  }
});

app.get("/api/wellrole_binding/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM well_sftr_role WHERE well_s = $1",
      [id]
    );
    const bindings = result.rows;
    res.send(bindings);
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

app.post("/api/wells", authMiddleware, async (req, res) => {
  console.log("ЧТО ПРИШЛО");
  console.log(req.body);
  if (
    !req.body.wellId ||
    !req.body.altVal ||
    !req.body.cordX ||
    !req.body.cordY
  )
    return res.status(450).send("Заполните все обязательные поля");

  try {
    let alias;
    const result = await pool.query(
      "INSERT INTO well(well_id,r_existence_kd_nm,r_naming_system_kd,spud_date) VALUES($1,$2,$3,$4) RETURNING *",
      [
        req.body.wellId,
        req.body.wellExistence,
        req.body.wellNamingSystem,
        req.body.wellSpudDate,
      ]
    );
    const changeIdPoll = await pool.query(
      "UPDATE well SET well_id=$1 WHERE well_s=$2 RETURNING *",
      [
        fillNzeros(req.body.sourceField, 4) +
          fillNzeros(result.rows[0].well_s, 6) +
          fillNzeros(result.rows[0].well_id, 2),
        result.rows[0].well_s,
      ]
    );
    if (req.body.alias) {
      alias = await pool.query(
        "INSERT INTO well_alias(well_s,identifier,r_naming_system_kd) VALUES($1,$2,$3) RETURNING *",
        [changeIdPoll.rows[0].well_s, req.body.alias, req.body.aliasSys]
      );
    }

    const wellSftrRolePool = await pool.query(
      "INSERT INTO well_sftr_role(well_s,r_well_sftr_rle_kd,esrf_feature_s,esrf_feature_t) VALUES($1,$2,$3,$4) RETURNING *",
      [
        changeIdPoll.rows[0].well_s,
        req.body.relation,
        req.body.sourceField,
        "field",
      ]
    );

    const wellSurfacePtPool = await pool.query(
      "INSERT INTO well_surface_pt(well_s,well_surface_pt_id) VALUES($1,$2) RETURNING *",
      [
        result.rows[0].well_s,
        "" +
          changeIdPoll.rows[0].well_id +
          "_" +
          changeIdPoll.rows[0].r_existence_kd_nm,
      ]
    );
    const pLoc1dPool = await pool.query(
      "INSERT INTO p_location_1d(well_surface_pt_s,data_value_1_o,data_value_1_ou,data_value_cs,preferred_flag) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [
        wellSurfacePtPool.rows[0].well_surface_pt_s,
        req.body.altVal,
        req.body.altValU,
        req.body.altSys,
        req.body.altPrefFlag ?? 0,
      ]
    );

    const pLoc2dPool = await pool.query(
      "INSERT INTO p_location_2d(well_surface_pt_s,data_value_1_o,data_value_1_ou,data_value_2_o,data_value_2_ou,data_value_cs,preferred_flag) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [
        wellSurfacePtPool.rows[0].well_surface_pt_s,
        req.body.cordX,
        req.body.cordXU,
        req.body.cordY,
        req.body.cordYU,
        req.body.cordSystem,
        req.body.altPrefFlag ?? 0,
      ]
    );

    res.send({
      well: changeIdPoll.rows[0],
      geopoint: [
        wellSurfacePtPool.rows[0],
        pLoc1dPool.rows[0],
        pLoc2dPool.rows[0],
      ],
      wellBinding: wellSftrRolePool.rows[0],
      alias: alias ? alias.rows[0] : undefined,
    });
  } catch (error) {
    console.log("ОШИБКА");
    console.log(error);
    res.status(500).send(error);
  }
});

app.delete("/api/wells/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const geopointIDPool = await pool.query(
      "SELECT well_surface_pt_s FROM well_surface_pt WHERE well_s=$1",
      [id]
    );
    console.log(geopointIDPool);

    await pool
      .query("DELETE FROM p_location_2d WHERE well_surface_pt_s=$1", [
        geopointIDPool.rows[0].well_surface_pt_s,
      ])
      .then(() => {
        pool.query("DELETE FROM p_location_2d WHERE well_surface_pt_s=$1", [
          geopointIDPool.rows[0].well_surface_pt_s,
        ]);
      })
      .then(() => {
        pool.query("DELETE FROM well_surface_pt WHERE well_surface_pt_s=$1", [
          geopointIDPool.rows[0].well_surface_pt_s,
        ]);
      })
      .catch((error) => res.status(450).send(error));

    await pool.query("DELETE FROM well_alias WHERE well_s=$1", [id]);
    await pool.query("DELETE FROM well_sftr_role WHERE well_s=$1", [id]);
    await pool.query("DELETE FROM well WHERE well_s=$1", [id]);
    return res.status(200).send("DELETED WITH SUCCESS");
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
});

app.put("/api/wells/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  console.log(id);
  if (
    !req.body.wellId ||
    !req.body.altVal ||
    !req.body.cordX ||
    !req.body.cordY
  )
    return res.status(450).send("Заполните все обязательные поля");
  const client = new Client(DB_PARAMS);
  try {
    await client.connect();
    await client.query("BEGIN");

    await client.query(
      "UPDATE well SET well_id=$1,r_existence_kd_nm=$2,r_naming_system_kd=$3,spud_date=$4 WHERE well_s=$5",
      [
        req.body.wellId,
        req.body.wellExistence,
        req.body.wellNamingSystem,
        req.body.wellSpudDate ?? null,
        id,
      ]
    );
    if (req.body.alias) {
      await client.query(
        "UPDATE well_alias SET identifier=$1,r_naming_system_kd=$2 WHERE well_s=$3",
        [req.body.alias, req.body.aliasSys, id]
      );
    }

    await client.query(
      "UPDATE well_sftr_role SET r_well_sftr_rle_kd=$1,esrf_feature_s=$2 WHERE well_s=$3",
      [req.body.relation, req.body.sourceField, id]
    );

    const geoPoint = await client.query(
      "SELECT well_surface_pt_s from well_surface_pt WHERE well_s=$1",
      [id]
    );
    const ptId = geoPoint.rows[0].well_surface_pt_s;

    await client.query(
      "UPDATE p_location_2d SET data_value_1_o=$1,data_value_1_ou=$2,data_value_2_o=$3,data_value_2_ou=$4,data_value_cs=$5,preferred_flag=$6 WHERE well_surface_pt_s=$7",
      [
        req.body.cordX,
        req.body.cordXU,
        req.body.cordY,
        req.body.cordYU,
        req.body.cordSystem,
        req.body.altPrefFlag ?? 0,
        ptId,
      ]
    );

    await client.query(
      "UPDATE p_location_1d SET data_value_1_o=$1,data_value_1_ou=$2,data_value_cs=$3,preferred_flag=$4 WHERE well_surface_pt_s=$5",
      [
        req.body.altVal,
        req.body.altValU,
        req.body.altSys,
        req.body.altPrefFlag ?? 0,
        ptId,
      ]
    );

    await client.query(
      "UPDATE well_surface_pt SET well_surface_pt_id=$1 WHERE well_surface_pt_s=$2",
      ["" + req.body.wellId + "_" + req.body.wellExistence, ptId]
    );
    await client.query("COMMIT");
    res.status(200).send({ well_s: id, well_surface_pt_s: ptId });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(450).send(error);
    console.log(error);
  } finally {
    await client.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
