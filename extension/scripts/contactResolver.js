/**
 * Vesper - Contact Resolver Module
 * Matches extracted information with Gmail contacts
 */

import { searchContacts } from './gmailAPI.js';

// Process extracted information and find matching contacts
const resolveContacts = async (extractedInfo) => {
  if (!extractedInfo) {
    return {
      success: false,
      error: 'No extracted information provided',
      contacts: []
    };
  }
  
  try {
    const { name, organization } = extractedInfo;
    let contacts = [];
    
    // Search by name if available
    if (name) {
      const nameResults = await searchContacts(name);
      if (nameResults.success) {
        contacts = [...nameResults.contacts];
      }
    }
    
    // Search by organization if available
    if (organization && organization.length > 0) {
      const orgResults = await searchContacts(organization);
      if (orgResults.success) {
        // Add non-duplicate contacts from org search
        const existingEmails = new Set(contacts.map(c => c.email));
        const newContacts = orgResults.contacts.filter(c => !existingEmails.has(c.email));
        contacts = [...contacts, ...newContacts];
      }
    }
    
    // Sort and rank contacts (basic implementation)
    const rankedContacts = rankContacts(contacts, { name, organization });
    
    return {
      success: true,
      contacts: rankedContacts
    };
    
  } catch (error) {
    console.error('Error resolving contacts:', error);
    return {
      success: false,
      error: error.message,
      contacts: []
    };
  }
};

// Rank contacts based on relevance to extracted info
const rankContacts = (contacts, extractedInfo) => {
  const { name, organization } = extractedInfo;
  
  // Score each contact based on matching criteria
  return contacts.map(contact => {
    let score = 0;
    
    // Name matching (simple substring matching for now)
    if (name && contact.name) {
      const nameLower = name.toLowerCase();
      const contactNameLower = contact.name.toLowerCase();
      
      if (contactNameLower === nameLower) {
        // Exact match
        score += 10;
      } else if (contactNameLower.includes(nameLower) || nameLower.includes(contactNameLower)) {
        // Partial match
        score += 5;
      }
    }
    
    // Organization matching
    if (organization && contact.organization) {
      const orgLower = organization.toLowerCase();
      const contactOrgLower = contact.organization.toLowerCase();
      
      if (contactOrgLower === orgLower) {
        // Exact match
        score += 8;
      } else if (contactOrgLower.includes(orgLower) || orgLower.includes(contactOrgLower)) {
        // Partial match
        score += 4;
      }
    }
    
    return {
      ...contact,
      score
    };
  })
  .sort((a, b) => b.score - a.score); // Sort by score descending
};

// Get a single best match (if needed)
const getBestMatch = async (extractedInfo) => {
  const result = await resolveContacts(extractedInfo);
  
  if (!result.success || result.contacts.length === 0) {
    return {
      success: false,
      error: result.error || 'No matching contacts found',
      contact: null
    };
  }
  
  return {
    success: true,
    contact: result.contacts[0] // Return the highest ranked contact
  };
};

// Export functions
export {
  resolveContacts,
  getBestMatch
}; 