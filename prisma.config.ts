import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    // The CLI requires a direct connection (port 5432) to create tables
    url: env("DIRECT_URL"),
  },
});