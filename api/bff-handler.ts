import { createApp } from "../apps/bff/dist/app.js";
import { getCatalogRepository } from "../apps/bff/dist/repositories/index.js";
import { applyVercelServerlessDefaults } from "./vercel-serverless-env.js";

applyVercelServerlessDefaults();
getCatalogRepository();

export default createApp();
