import { supabase } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/api/organizations';
import { Database } from '@/types/database';

export type Tag = Database['public']['Tables']['tags']['Row'];
export type TagInsert = Database['public']['Tables']['tags']['Insert'];
export type TagUpdate = Database['public']['Tables']['tags']['Update'];

interface GetTagsFilters {
  search?: string;
}

export async function getTags(filters: GetTagsFilters = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return [];
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return [];

  let query = supabase
    .from('tags')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
  
  return data || [];
}

export async function getTagsByContactId(contactId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return [];
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from('contact_tags')
    .select('tag_id')
    .eq('contact_id', contactId);
  
  if (error) {
    console.error('Error fetching contact tags:', error);
    throw error;
  }
  
  // Get full tag details for each tag_id
  const tagIds = data.map(item => item.tag_id);
  if (tagIds.length === 0) return [];
  
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('*')
    .in('id', tagIds)
    .eq('org_id', orgId);
  
  if (tagsError) {
    console.error('Error fetching tag details:', tagsError);
    throw tagsError;
  }
  
  return tags || [];
}

export async function createTag(tagData: TagInsert) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No organization found');

  const { data, error } = await supabase
    .from('tags')
    .insert({
      ...tagData,
      user_id: session.user.id,
      org_id: orgId,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating tag:', error);
    throw error;
  }
  
  return data;
}

export async function updateTag(tagId: string, tagData: TagUpdate) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No organization found');

  const { data, error } = await supabase
    .from('tags')
    .update(tagData)
    .eq('id', tagId)
    .eq('org_id', orgId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
  
  return data;
}

export async function deleteTag(tagId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No organization found');

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId)
    .eq('org_id', orgId);
  
  if (error) {
    console.error('Error deleting tag:', error);
    throw error;
  }
  
  return true;
}

export async function addTagToContact(contactId: string, tagId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No organization found');

  const { error } = await supabase
    .from('contact_tags')
    .insert({ contact_id: contactId, tag_id: tagId });
  
  if (error) {
    console.error('Error adding tag to contact:', error);
    throw error;
  }
  
  return true;
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error('No organization found');

  const { error } = await supabase
    .from('contact_tags')
    .delete()
    .eq('contact_id', contactId)
    .eq('tag_id', tagId);
  
  if (error) {
    console.error('Error removing tag from contact:', error);
    throw error;
  }
  
  return true;
}

export async function getAvailableTagsForContact(contactId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return [];
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return [];

  // Get all tags
  const { data: allTags, error: tagsError } = await supabase
    .from('tags')
    .select('*')
    .eq('org_id', orgId)
    .order('name');
  
  if (tagsError) {
    console.error('Error fetching all tags:', tagsError);
    throw tagsError;
  }
  
  // Get contact's existing tags
  const { data: contactTags } = await supabase
    .from('contact_tags')
    .select('tag_id')
    .eq('contact_id', contactId);
  
  const existingTagIds = new Set((contactTags || []).map(item => item.tag_id));
  
  // Filter out tags that are already assigned
  return (allTags || []).filter(tag => !existingTagIds.has(tag.id));
}
