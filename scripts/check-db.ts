import 'dotenv/config';
import { getSupabase, throwDatabaseError } from '../src/config/supabase';

async function main(): Promise<void> {
    const { error } = await getSupabase() 
        .from('restaurants')
        .select('id,name,category,location,price_range,rating,description,recommended_menu,likes,image')
        .limit(1);
    if (error) throwDatabaseError(error);
    console.log('[Supabase] successfully connected to the restaurants table');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Failed to check DB connection');
  process.exitCode = 1;
});