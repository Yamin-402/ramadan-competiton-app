import app from "./app.js";
import { env } from "./core/config/env.js";

app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
});