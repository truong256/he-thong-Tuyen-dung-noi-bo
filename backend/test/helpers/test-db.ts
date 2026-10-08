import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { JobTitle } from '../../src/job-titles/job-title.entity';

/** DB SQLite in-memory (sql.js) cho test: schema, ràng buộc UNIQUE và CHECK đều thật. */
export async function createTestDataSource(): Promise<DataSource> {
  const ds = new DataSource({
    type: 'sqljs',
    entities: [JobTitle],
    synchronize: true,
    autoSave: false,
  });
  return ds.initialize();
}
