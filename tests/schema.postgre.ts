import { PGlite } from '@electric-sql/pglite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test, before, beforeEach, after, afterEach } from 'node:test';
import Restaurant from '../src/models/restaurant.model';
import type { RestaurantRow } from '../src/types/database.types';

const schema = readFileSync(path.join(__dirname, '../supabase/schema.sql'), 'utf8');
const seed = readFileSync(path.join(__dirname, '../supabase/seed.sql'), 'utf8');
const original = JSON.parse(readFileSync(path.join(__dirname, '../src/data/restaurants.json'), 'utf8'));
let db: PGlite;
let directory: string;

before(async () => {
  directory = mkdtempSync(path.join(tmpdir(), 'pwd-week7-db-'));
  db = new PGlite(directory);
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(schema);
});

beforeEach(async () => {
  await db.exec('reset role; truncate public.restaurants restart identity;');
});

afterEach(async () => {
  await db.exec('reset role; drop function if exists public.fail_demo_reset() cascade;');
});

after(async () => {
  await db?.close();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

async function restaurants() {
  const { rows } = await db.query<RestaurantRow>('select * from public.restaurants order by id');
  return JSON.parse(JSON.stringify(rows.map(Restaurant.fromDatabase)));
}

test('initial data matches all fields of original JSON and preserves existing rows upon re-execution', async () => {
  await db.exec(seed);
  assert.deepEqual(await restaurants(), original);
  await db.query("update public.restaurants set description='Content to preserve' where id=1");
  await db.exec(seed);
  assert.equal((await restaurants())[0].description, 'Content to preserve');
  assert.equal((await restaurants()).length, 3);
});

test('DB generates ID and default values while preserving menu array', async () => {
  await db.exec(seed);
  const { rows } = await db.query<RestaurantRow>(
    'insert into public.restaurants(name,category,location,recommended_menu) values ($1,$2,$3,$4) returning *',
    ['DB Restaurant', 'Korean', 'Ajou University', ['Gimbap', 'Ramen']],
  );
  const item = Restaurant.fromDatabase(rows[0]);
  assert.equal(item.id, 4);
  assert.equal(item.priceRange, 'No information available');
  assert.equal(item.rating, 0);
  assert.equal(item.likes, 0);
  assert.equal(item.image, '');
  assert.deepEqual(item.recommendedMenu, ['Gimbap', 'Ramen']);
});

test('added restaurant is retained after closing and reopening DB', async () => {
  await db.exec(seed);
  await db.query("insert into public.restaurants(name,category,location) values ('Restart Check','Korean','Campus')");
  await db.close();
  db = new PGlite(directory);
  assert.equal((await restaurants()).find((item: { id: number }) => item.id === 4).name, 'Restart Check');
});

test('legacy reset-demo function restores initial 3 records along with the next ID sequence', async () => {
  await db.exec(seed);
  await db.query("insert into public.restaurants(name,category,location) values ('Additional Restaurant','Snack Bar','Campus')");
  await db.exec('set role service_role');
  await db.query('select public.reset_restaurant_demo_data()');
  assert.deepEqual(await restaurants(), original);
  const { rows } = await db.query<{ id: number }>("insert into public.restaurants(name,category,location) values ('Next Restaurant','Korean','Campus') returning id");
  assert.equal(rows[0].id, 4);
});

test('original DB data is not deleted if resetting fails midway', async () => {
  await db.exec(seed);
  await db.query("insert into public.restaurants(name,category,location) values ('Preservation Check','Korean','Campus')");
  const previous = await restaurants();
  await db.exec(`
    create function public.fail_demo_reset() returns trigger language plpgsql as $$
    begin raise exception 'reset failure'; end; $$;
    create trigger fail_demo_reset before insert on public.restaurants
    for each row when (new.id=1) execute function public.fail_demo_reset();
  `);
  await assert.rejects(db.query('select public.reset_restaurant_demo_data()'), /reset failure/);
  assert.deepEqual(await restaurants(), previous);
});

test('direct DB access is allowed only for service roles and restricted for public roles', async () => {
  await db.exec(seed);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from public.restaurants'), { code: '42501' });
    await assert.rejects(db.query('select public.reset_restaurant_demo_data()'), { code: '42501' });
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  assert.equal((await restaurants()).length, 3);
});