
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugGallery() {
  const hakoId = '3400a4d5-6ce1-426b-87b4-3a525a75cf99'; // From user's previous context or I'll try to find it
  
  console.log(`Checking gallery posts for Hako: ${hakoId}`);
  
  // 1. Total posts with images
  const { data: allPosts, error: allErr } = await supabase
    .from('hako_timeline_posts')
    .select('id, image_urls, image_url, hako_id')
    .eq('hako_id', hakoId);
    
  if (allErr) {
    console.error('Error fetching all posts:', allErr);
    return;
  }
  
  console.log(`Total posts in Hako: ${allPosts.length}`);
  const withImages = allPosts.filter(p => (p.image_urls && p.image_urls.length > 0) || p.image_url);
  console.log(`Posts with images (filtered in JS): ${withImages.length}`);
  
  // 2. Check the specific query used in actions.ts
  const { data: galleryData, error: galleryErr } = await supabase
    .from('hako_timeline_posts')
    .select(`
      id,
      image_urls,
      image_url,
      hako_id,
      profiles:user_id (display_name),
      hako_members!inner(display_name, hako_id)
    `)
    .eq('hako_id', hakoId)
    .eq('hako_members.hako_id', hakoId);

  if (galleryErr) {
    console.error('Error with inner join query:', galleryErr);
  } else {
    console.log(`Posts found with inner join: ${galleryData.length}`);
  }

  // 3. Try without inner join
  const { data: galleryDataLeft, error: galleryErrLeft } = await supabase
    .from('hako_timeline_posts')
    .select(`
      id,
      image_urls,
      image_url,
      hako_id,
      profiles:user_id (display_name),
      hako_members(display_name, hako_id)
    `)
    .eq('hako_id', hakoId)
    .eq('hako_members.hako_id', hakoId);

  if (galleryErrLeft) {
    console.error('Error with outer join query:', galleryErrLeft);
  } else {
    console.log(`Posts found with outer join and filter: ${galleryDataLeft.length}`);
  }
}

debugGallery();
