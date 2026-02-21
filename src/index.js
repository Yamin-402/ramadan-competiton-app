import app from "./app.js";
import { env } from "./core/config/env.js";

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${env.port}`);
});