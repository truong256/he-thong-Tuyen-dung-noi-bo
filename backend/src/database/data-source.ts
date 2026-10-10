import 'dotenv/config';
import { DataSource } from 'typeorm';
import { loadAppConfig } from '../config/app.config';
import { buildPostgresOptions } from './typeorm.options';

/** Dùng cho CLI: npm run migration:run */
export default new DataSource(buildPostgresOptions(loadAppConfig().db));
