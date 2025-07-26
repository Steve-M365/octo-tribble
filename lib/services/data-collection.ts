import axios from 'axios'
import * as cheerio from 'cheerio'

// Types for data collection
interface ScrapingTarget {
  name: string
  baseUrl: string
  selectors: {
    agencies?: string
    recruiters?: string
    contacts?: string
  }
  rateLimit: number
  requiresAuth?: boolean
}

interface ContactDiscoveryResult {
  emails: string[]
  phones: string[]
  socialProfiles: {
    linkedin?: string
    twitter?: string
    facebook?: string
  }
  verified: boolean
  confidence: number
}

interface AgencyData {
  name: string
  website?: string
  description?: string
  location: {
    country: string
    region?: string
    city?: string
  }
  contacts: ContactDiscoveryResult
  size?: string
  specializations?: string[]
  recruiters?: RecruiterData[]
}

interface RecruiterData {
  firstName: string
  lastName: string
  title: string
  email?: string
  phone?: string
  linkedin?: string
  specializations: {
    industries: string[]
    functions: string[]
    seniorityLevels: string[]
  }
  location: {
    country: string
    region?: string
    city?: string
  }
}

class DataCollectionService {
  private readonly scraperConfig: ScrapingTarget[] = [
    {
      name: 'LinkedIn',
      baseUrl: 'https://www.linkedin.com',
      selectors: {
        agencies: '.org-company-card',
        recruiters: '.people-search-card',
        contacts: '.contact-info'
      },
      rateLimit: 2000,
      requiresAuth: true
    },
    {
      name: 'Indeed',
      baseUrl: 'https://www.indeed.com',
      selectors: {
        agencies: '.company-card',
        recruiters: '.recruiter-profile'
      },
      rateLimit: 1000
    },
    {
      name: 'RPO Directory',
      baseUrl: 'https://www.rpodirectory.com',
      selectors: {
        agencies: '.agency-listing',
        contacts: '.contact-details'
      },
      rateLimit: 500
    }
  ]

  private readonly emailPatterns = [
    '{first}.{last}@{domain}',
    '{first}{last}@{domain}',
    '{f}{last}@{domain}',
    '{first}@{domain}',
    'info@{domain}',
    'contact@{domain}',
    'careers@{domain}',
    'recruitment@{domain}'
  ]

  // Main data collection orchestrator
  async collectAgencyData(
    searchParams: {
      country?: string
      region?: string
      city?: string
      industry?: string
      size?: string
    }
  ): Promise<AgencyData[]> {
    const results: AgencyData[] = []
    
    try {
      // Multi-source data collection
      const linkedinData = await this.scrapeLinkedInAgencies(searchParams)
      const directoryData = await this.scrapeDirectories(searchParams)
      const jobBoardData = await this.scrapeJobBoards(searchParams)
      const apiData = await this.fetchFromAPIs(searchParams)

      // Combine and deduplicate results
      const combinedData = [...linkedinData, ...directoryData, ...jobBoardData, ...apiData]
      const deduplicatedData = this.deduplicateAgencies(combinedData)

      // Enhance with contact discovery
      for (const agency of deduplicatedData) {
        agency.contacts = await this.discoverContacts(agency)
        agency.recruiters = await this.findAgencyRecruiters(agency)
        results.push(agency)
      }

      return results
    } catch (error) {
      console.error('Data collection failed:', error)
      throw new Error('Failed to collect agency data')
    }
  }

  // LinkedIn scraping (requires authentication and careful rate limiting)
  private async scrapeLinkedInAgencies(searchParams: any): Promise<AgencyData[]> {
    const agencies: AgencyData[] = []
    
    try {
      // Simulate LinkedIn company search
      const searchQuery = this.buildLinkedInSearchQuery(searchParams)
      
      // Note: Actual implementation would use LinkedIn Sales Navigator API
      // or legitimate scraping with proper authentication
      
      // Mock data for demonstration
      const mockLinkedInAgencies = [
        {
          name: 'TechRecruit Global',
          website: 'https://techrecruit.com',
          description: 'Leading technology recruitment agency',
          location: {
            country: searchParams.country || 'United States',
            region: 'California',
            city: 'San Francisco'
          },
          contacts: {
            emails: [],
            phones: [],
            socialProfiles: {
              linkedin: 'https://linkedin.com/company/techrecruit'
            },
            verified: false,
            confidence: 0.8
          },
          specializations: ['Technology', 'Software Engineering', 'AI/ML']
        }
      ]

      return mockLinkedInAgencies
    } catch (error) {
      console.error('LinkedIn scraping failed:', error)
      return []
    }
  }

  // Directory scraping (RPO Directory, Hunt Scanlon, etc.)
  private async scrapeDirectories(searchParams: any): Promise<AgencyData[]> {
    const agencies: AgencyData[] = []

    for (const directory of this.scraperConfig) {
      if (directory.name === 'RPO Directory') {
        try {
          await this.delay(directory.rateLimit)
          
          // Mock directory scraping
          const directoryResults = await this.scrapeDirectory(directory, searchParams)
          agencies.push(...directoryResults)
          
        } catch (error) {
          console.error(`Failed to scrape ${directory.name}:`, error)
        }
      }
    }

    return agencies
  }

  // Job board scraping
  private async scrapeJobBoards(searchParams: any): Promise<AgencyData[]> {
    const agencies: AgencyData[] = []

    // Mock job board data extraction
    // In reality, this would scrape Indeed, Monster, etc. for recruiter contact info
    
    return agencies
  }

  // API integrations
  private async fetchFromAPIs(searchParams: any): Promise<AgencyData[]> {
    const agencies: AgencyData[] = []

    try {
      // Google Places API for business listings
      const googleData = await this.fetchGooglePlaces(searchParams)
      agencies.push(...googleData)

      // Clearbit API for company data
      const clearbitData = await this.fetchClearbitData(searchParams)
      agencies.push(...clearbitData)

      // Apollo.io API for contact data
      const apolloData = await this.fetchApolloData(searchParams)
      agencies.push(...apolloData)

    } catch (error) {
      console.error('API integration failed:', error)
    }

    return agencies
  }

  // Contact discovery engine
  private async discoverContacts(agency: AgencyData): Promise<ContactDiscoveryResult> {
    const result: ContactDiscoveryResult = {
      emails: [],
      phones: [],
      socialProfiles: {},
      verified: false,
      confidence: 0
    }

    try {
      // Email discovery
      if (agency.website) {
        result.emails = await this.discoverEmails(agency.website, agency.name)
      }

      // Phone discovery
      result.phones = await this.discoverPhones(agency.website || '', agency.name)

      // Social media discovery
      result.socialProfiles = await this.discoverSocialProfiles(agency.name)

      // Verify contacts
      result.verified = await this.verifyContacts(result)
      result.confidence = this.calculateConfidence(result)

    } catch (error) {
      console.error('Contact discovery failed:', error)
    }

    return result
  }

  // Email discovery with pattern matching
  private async discoverEmails(website: string, companyName: string): Promise<string[]> {
    const emails: string[] = []
    
    try {
      // Extract domain from website
      const domain = new URL(website).hostname.replace('www.', '')
      
      // Scrape website for emails
      const websiteEmails = await this.scrapeWebsiteForEmails(website)
      emails.push(...websiteEmails)

      // Generate email patterns
      const patternEmails = this.generateEmailPatterns(domain, companyName)
      emails.push(...patternEmails)

      // Use Hunter.io API for email discovery
      const hunterEmails = await this.fetchHunterEmails(domain)
      emails.push(...hunterEmails)

    } catch (error) {
      console.error('Email discovery failed:', error)
    }

    return [...new Set(emails)] // Remove duplicates
  }

  // Phone number discovery
  private async discoverPhones(website: string, companyName: string): Promise<string[]> {
    const phones: string[] = []

    try {
      if (website) {
        // Scrape website for phone numbers
        const response = await axios.get(website, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RecruiterBot/1.0)'
          }
        })

        const $ = cheerio.load(response.data)
        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
        
        const text = $.text()
        const matches = text.match(phoneRegex)
        if (matches) {
          phones.push(...matches)
        }
      }

      // Search Google My Business for phone numbers
      const googlePhones = await this.fetchGoogleBusinessPhone(companyName)
      phones.push(...googlePhones)

    } catch (error) {
      console.error('Phone discovery failed:', error)
    }

    return [...new Set(phones)]
  }

  // Social media profile discovery
  private async discoverSocialProfiles(companyName: string): Promise<{[key: string]: string}> {
    const profiles: {[key: string]: string} = {}

    try {
      // Search for LinkedIn company page
      profiles.linkedin = await this.findLinkedInCompanyPage(companyName)
      
      // Search for Twitter/X profile
      profiles.twitter = await this.findTwitterProfile(companyName)
      
      // Search for Facebook business page
      profiles.facebook = await this.findFacebookBusinessPage(companyName)

    } catch (error) {
      console.error('Social profile discovery failed:', error)
    }

    return profiles
  }

  // Recruiter discovery for an agency
  private async findAgencyRecruiters(agency: AgencyData): Promise<RecruiterData[]> {
    const recruiters: RecruiterData[] = []

    try {
      // LinkedIn employee search
      const linkedinRecruiters = await this.findLinkedInEmployees(agency.name)
      recruiters.push(...linkedinRecruiters)

      // Website team page scraping
      if (agency.website) {
        const websiteRecruiters = await this.scrapeTeamPage(agency.website)
        recruiters.push(...websiteRecruiters)
      }

      // Job posting analysis for recruiter contacts
      const jobPostingRecruiters = await this.analyzeJobPostings(agency.name)
      recruiters.push(...jobPostingRecruiters)

    } catch (error) {
      console.error('Recruiter discovery failed:', error)
    }

    return this.deduplicateRecruiters(recruiters)
  }

  // Contact verification
  private async verifyContacts(contacts: ContactDiscoveryResult): Promise<boolean> {
    let verificationScore = 0
    let totalChecks = 0

    // Email verification
    for (const email of contacts.emails) {
      totalChecks++
      if (await this.verifyEmail(email)) {
        verificationScore++
      }
    }

    // Phone verification
    for (const phone of contacts.phones) {
      totalChecks++
      if (await this.verifyPhone(phone)) {
        verificationScore++
      }
    }

    return totalChecks > 0 && (verificationScore / totalChecks) > 0.5
  }

  // Email verification using SMTP
  private async verifyEmail(email: string): Promise<boolean> {
    try {
      // Simple email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return false
      }

      // In production, would use email verification service
      // like ZeroBounce, NeverBounce, or EmailListVerify
      
      return true // Mock verification
    } catch (error) {
      return false
    }
  }

  // Phone verification
  private async verifyPhone(phone: string): Promise<boolean> {
    try {
      // Basic phone format validation
      const cleanPhone = phone.replace(/\D/g, '')
      return cleanPhone.length >= 10 && cleanPhone.length <= 15
    } catch (error) {
      return false
    }
  }

  // Utility methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private deduplicateAgencies(agencies: AgencyData[]): AgencyData[] {
    const seen = new Set<string>()
    return agencies.filter(agency => {
      const key = `${agency.name.toLowerCase()}-${agency.location.country.toLowerCase()}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private deduplicateRecruiters(recruiters: RecruiterData[]): RecruiterData[] {
    const seen = new Set<string>()
    return recruiters.filter(recruiter => {
      const key = `${recruiter.firstName.toLowerCase()}-${recruiter.lastName.toLowerCase()}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private calculateConfidence(contacts: ContactDiscoveryResult): number {
    let score = 0
    
    if (contacts.emails.length > 0) score += 0.3
    if (contacts.phones.length > 0) score += 0.3
    if (Object.keys(contacts.socialProfiles).length > 0) score += 0.2
    if (contacts.verified) score += 0.2
    
    return Math.min(score, 1.0)
  }

  // Mock implementation methods (would be replaced with actual APIs/scraping)
  private buildLinkedInSearchQuery(params: any): string {
    return `recruitment agency ${params.city || ''} ${params.country || ''}`
  }

  private async scrapeDirectory(directory: ScrapingTarget, params: any): Promise<AgencyData[]> {
    // Mock implementation
    return []
  }

  private async fetchGooglePlaces(params: any): Promise<AgencyData[]> {
    // Mock implementation - would use Google Places API
    return []
  }

  private async fetchClearbitData(params: any): Promise<AgencyData[]> {
    // Mock implementation - would use Clearbit API
    return []
  }

  private async fetchApolloData(params: any): Promise<AgencyData[]> {
    // Mock implementation - would use Apollo.io API
    return []
  }

  private async scrapeWebsiteForEmails(website: string): Promise<string[]> {
    // Mock implementation
    return []
  }

  private generateEmailPatterns(domain: string, companyName: string): string[] {
    // Mock implementation
    return [
      `info@${domain}`,
      `contact@${domain}`,
      `careers@${domain}`
    ]
  }

  private async fetchHunterEmails(domain: string): Promise<string[]> {
    // Mock implementation - would use Hunter.io API
    return []
  }

  private async fetchGoogleBusinessPhone(companyName: string): Promise<string[]> {
    // Mock implementation
    return []
  }

  private async findLinkedInCompanyPage(companyName: string): Promise<string> {
    // Mock implementation
    return `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`
  }

  private async findTwitterProfile(companyName: string): Promise<string> {
    // Mock implementation
    return ''
  }

  private async findFacebookBusinessPage(companyName: string): Promise<string> {
    // Mock implementation
    return ''
  }

  private async findLinkedInEmployees(companyName: string): Promise<RecruiterData[]> {
    // Mock implementation
    return []
  }

  private async scrapeTeamPage(website: string): Promise<RecruiterData[]> {
    // Mock implementation
    return []
  }

  private async analyzeJobPostings(companyName: string): Promise<RecruiterData[]> {
    // Mock implementation
    return []
  }
}

// Specialization detection service
class SpecializationDetectionService {
  private readonly industryKeywords = {
    'Technology': ['software', 'tech', 'IT', 'developer', 'engineer', 'programming'],
    'Finance': ['finance', 'banking', 'investment', 'trading', 'fintech'],
    'Healthcare': ['healthcare', 'medical', 'pharma', 'clinical', 'hospital'],
    'Manufacturing': ['manufacturing', 'automotive', 'aerospace', 'industrial'],
    'Consulting': ['consulting', 'strategy', 'management', 'advisory']
  }

  private readonly functionKeywords = {
    'Software Engineering': ['software engineer', 'developer', 'programmer', 'architect'],
    'Executive Search': ['CEO', 'CTO', 'VP', 'director', 'executive'],
    'Sales': ['sales', 'business development', 'account manager'],
    'Marketing': ['marketing', 'brand', 'digital marketing', 'content']
  }

  async detectSpecializations(
    profileText: string, 
    jobPostings: string[], 
    clientList: string[]
  ): Promise<{
    industries: string[]
    functions: string[]
    seniorityLevels: string[]
  }> {
    const text = (profileText + ' ' + jobPostings.join(' ')).toLowerCase()
    
    const industries = this.detectIndustries(text)
    const functions = this.detectFunctions(text)
    const seniorityLevels = this.detectSeniorityLevels(text)

    return { industries, functions, seniorityLevels }
  }

  private detectIndustries(text: string): string[] {
    const detected: string[] = []
    
    for (const [industry, keywords] of Object.entries(this.industryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        detected.push(industry)
      }
    }
    
    return detected
  }

  private detectFunctions(text: string): string[] {
    const detected: string[] = []
    
    for (const [func, keywords] of Object.entries(this.functionKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        detected.push(func)
      }
    }
    
    return detected
  }

  private detectSeniorityLevels(text: string): string[] {
    const levels: string[] = []
    
    if (text.includes('senior') || text.includes('sr.')) levels.push('Senior')
    if (text.includes('junior') || text.includes('jr.')) levels.push('Junior')
    if (text.includes('principal') || text.includes('staff')) levels.push('Principal')
    if (text.includes('director') || text.includes('vp') || text.includes('head of')) levels.push('Director')
    if (text.includes('ceo') || text.includes('cto') || text.includes('chief')) levels.push('C-Suite')
    
    return levels
  }
}

// Export services
export const dataCollectionService = new DataCollectionService()
export const specializationDetectionService = new SpecializationDetectionService()

// Export types
export type { AgencyData, RecruiterData, ContactDiscoveryResult }