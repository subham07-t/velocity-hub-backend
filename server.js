require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { corsOptions } = require("./config/corsOptions");
const routes = require("./routes/routes");

// port
const PORT = process.env.PORT || 8080;

// initializing express
const app = express();

// support for json
app.use(express.json());

// support for html form data
app.use(express.urlencoded({ extended: true }));

// allow cors
app.use(cors(corsOptions));

// routes
app.use("/api", routes);

// start server
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
