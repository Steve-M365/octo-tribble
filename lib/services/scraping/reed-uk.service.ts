import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { dataCollectionService, AgencyData, RecruiterData } from '../data-collection';

interface ReedJobResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  postedDate: string;
  recruiterName?: string;
  recruiterEmail?: string;
}

interface ReedCompanyProfile {
  name: string;
  description?: string;
  website?: string;
  size?: string;
  industry?: string;
  location?: string;
  logo?: string;
  companiesHouseNumber?: string;
}

@Injectable()
export class ReedUKService {
  private readonly logger = new Logger(ReedUKService.name);
  private readonly baseUrl = 'https://www.reed.co.uk';
  private readonly maxRetries = 3;
  private readonly requestDelay = 3000; // Slightly slower for UK compliance

  constructor(private configService: ConfigService) {}

  async scrapeUKRecruitmentMarket(): Promise<AgencyData[]> {
    this.logger.log('Starting comprehensive Reed UK recruitment market scraping');
    
    const agencies: AgencyData[] = [];
    
    try {
      // Phase 1: Search by UK regions and recruitment terms
      const ukQueries = await this.generateUKQueries();
      
      for (const query of ukQueries) {
        this.logger.debug(`Scraping UK query: ${query.searchTerm} in ${query.location}`);
        
        const queryResults = await this.scrapeByQuery(query);
        agencies.push(...queryResults);
        
        // Respectful delay for UK market
        await this.delay(this.requestDelay + Math.random() * 1000);
      }

      // Phase 2: Executive search specific scraping
      const executiveSearchAgencies = await this.scrapeExecutiveSearch();
      agencies.push(...executiveSearchAgencies);

      // Phase 3: Deduplicate and enrich with UK-specific data
      const uniqueAgencies = this.deduplicateAgencies(agencies);
      const enrichedAgencies = await this.enrichWithUKData(uniqueAgencies);

      this.logger.log(`Reed UK scraping completed: ${enrichedAgencies.length} unique agencies found`);
      return enrichedAgencies;

    } catch (error) {
      this.logger.error('Reed UK scraping failed', error);
      throw error;
    }
  }

  private async generateUKQueries(): Promise<Array<{searchTerm: string, location: string}>> {
    const searchTerms = [
      'recruitment consultant',
      'talent acquisition manager',
      'executive search consultant',
      'recruitment manager',
      'search consultant',
      'talent specialist',
      'recruitment director',
      'principal consultant'
    ];

    const ukLocations = [
      'London',
      'Manchester',
      'Birmingham',
      'Edinburgh',
      'Glasgow',
      'Bristol',
      'Leeds',
      'Liverpool',
      'Cardiff',
      'Belfast',
      'Cambridge',
      'Oxford',
      'Reading',
      'Nottingham',
      'Sheffield'
    ];

    const queries: Array<{searchTerm: string, location: string}> = [];
    
    for (const location of ukLocations) {
      for (const searchTerm of searchTerms) {
        queries.push({ searchTerm, location });
      }
    }

    return queries;
  }

  private async scrapeByQuery(query: {searchTerm: string, location: string}): Promise<AgencyData[]> {
    const browser = await this.launchUKBrowser();
    
    try {
      const page = await browser.newPage();
      await this.setupUKPageForScraping(page);

      // Navigate to Reed job search
      const searchUrl = this.buildReedSearchUrl(query.searchTerm, query.location);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for results or no results message
      await page.waitForSelector('.job-result, .no-results', { timeout: 15000 });

      // Check if no results
      const noResults = await page.$('.no-results');
      if (noResults) {
        this.logger.debug(`No results found for ${query.searchTerm} in ${query.location}`);
        return [];
      }

      // Extract job data from Reed
      const jobResults = await this.extractReedJobResults(page);
      
      // Process multiple pages
      const allJobResults = await this.scrapeAllReedPages(page, jobResults);
      
      // Convert to agency data
      const agencies = await this.convertReedJobsToAgencies(allJobResults, query.location);
      
      return agencies;

    } catch (error) {
      this.logger.error(`Failed to scrape Reed query ${query.searchTerm} in ${query.location}`, error);
      return [];
    } finally {
      await browser.close();
    }
  }

  private async scrapeExecutiveSearch(): Promise<AgencyData[]> {
    this.logger.log('Scraping UK executive search firms');
    
    const executiveSearchTerms = [
      'executive search',
      'board appointments',
      'c-suite recruitment', 
      'senior leadership recruitment',
      'executive recruitment',
      'search firm',
      'headhunting'
    ];

    const agencies: AgencyData[] = [];

    for (const searchTerm of executiveSearchTerms) {
      try {
        const searchAgencies = await this.scrapeExecutiveSearchTerm(searchTerm);
        agencies.push(...searchAgencies);
        
        await this.delay(4000 + Math.random() * 2000);
      } catch (error) {
        this.logger.warn(`Failed to scrape executive search term: ${searchTerm}`, error);
      }
    }

    return this.deduplicateAgencies(agencies);
  }

  private async scrapeExecutiveSearchTerm(searchTerm: string): Promise<AgencyData[]> {
    const browser = await this.launchUKBrowser();
    
    try {
      const page = await browser.newPage();
      await this.setupUKPageForScraping(page);

      // Search for executive search roles across UK
      const searchUrl = `${this.baseUrl}/jobs/${encodeURIComponent(searchTerm.replace(/\s+/g, '-'))}-jobs`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      await page.waitForSelector('.job-result, .no-results', { timeout: 15000 });

      // Extract executive search agencies
      const agencies = await page.evaluate(() => {
        const jobCards = Array.from(document.querySelectorAll('.job-result'));
        const agencyMap = new Map<string, any>();

        jobCards.forEach(card => {
          const companyElement = card.querySelector('.gtmJobListingPostedBy, .company-name');
          const locationElement = card.querySelector('.location');
          const titleElement = card.querySelector('.gtmJobListingJobTitleLink, .job-title');
          const descriptionElement = card.querySelector('.job-description, .description');

          if (companyElement) {
            const companyName = companyElement.textContent?.trim() || '';
            const location = locationElement?.textContent?.trim() || '';
            const title = titleElement?.textContent?.trim() || '';
            const description = descriptionElement?.textContent?.trim() || '';

            // Check if this is likely an executive search firm
            const isExecutiveSearchFirm = 
              companyName.toLowerCase().includes('search') ||
              companyName.toLowerCase().includes('executive') ||
              companyName.toLowerCase().includes('partners') ||
              description.toLowerCase().includes('executive search') ||
              description.toLowerCase().includes('board level') ||
              description.toLowerCase().includes('c-suite');

            if (isExecutiveSearchFirm && companyName.length > 2) {
              agencyMap.set(companyName.toLowerCase(), {
                name: companyName,
                location: location,
                tier: 'NATIONAL', // Executive search firms are typically national/international
                specializations: ['Executive Search', 'Board Appointments', 'C-Suite'],
                description: description,
                source: 'Reed UK Executive Search',
                extractedAt: new Date().toISOString(),
                executiveSearchFirm: true
              });
            }
          }
        });

        return Array.from(agencyMap.values());
      });

      return agencies.map(agency => this.convertToAgencyData(agency, 'United Kingdom'));

    } finally {
      await browser.close();
    }
  }

  private async launchUKBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        // UK-specific user agent
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      defaultViewport: {
        width: 1440,
        height: 900
      }
    });
  }

  private async setupUKPageForScraping(page: Page): Promise<void> {
    // Set UK-specific headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-GB,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    });

    // Override navigator for UK context
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-GB', 'en'],
      });

      // Override timezone for UK
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: function() {
          return {
            ...this.resolvedOptions(),
            timeZone: 'Europe/London'
          };
        }
      });
    });

    await this.simulateUKUserBehavior(page);
  }

  private async simulateUKUserBehavior(page: Page): Promise<void> {
    // Simulate UK user behavior patterns
    for (let i = 0; i < 2; i++) {
      await page.mouse.move(
        Math.random() * 1440,
        Math.random() * 900
      );
      await this.delay(150 + Math.random() * 250);
    }

    await page.evaluate(() => {
      window.scrollTo(0, Math.random() * 400);
    });
    
    await this.delay(800 + Math.random() * 1200);
  }

  private buildReedSearchUrl(searchTerm: string, location: string): string {
    const params = new URLSearchParams({
      keywords: searchTerm,
      location: location,
      sortby: 'date',
      proximity: '10'
    });
    
    return `${this.baseUrl}/jobs?${params.toString()}`;
  }

  private async extractReedJobResults(page: Page): Promise<ReedJobResult[]> {
    return await page.evaluate(() => {
      const jobCards = Array.from(document.querySelectorAll('.job-result'));
      const results: ReedJobResult[] = [];

      jobCards.forEach(card => {
        try {
          const titleElement = card.querySelector('.gtmJobListingJobTitleLink, .job-title a');
          const companyElement = card.querySelector('.gtmJobListingPostedBy, .company-name');
          const locationElement = card.querySelector('.location');
          const salaryElement = card.querySelector('.salary');
          const descriptionElement = card.querySelector('.job-description, .description');
          const linkElement = card.querySelector('.gtmJobListingJobTitleLink, .job-title a');

          const title = titleElement?.textContent?.trim() || '';
          const company = companyElement?.textContent?.trim() || '';
          const location = locationElement?.textContent?.trim() || '';
          const salary = salaryElement?.textContent?.trim();
          const description = descriptionElement?.textContent?.trim() || '';
          const url = linkElement?.getAttribute('href') || '';

          // Check if recruitment-related
          const isRecruitmentJob = 
            title.toLowerCase().includes('recruit') || 
            title.toLowerCase().includes('talent') ||
            title.toLowerCase().includes('search') ||
            title.toLowerCase().includes('headhunt') ||
            company.toLowerCase().includes('recruit') ||
            company.toLowerCase().includes('talent') ||
            company.toLowerCase().includes('search') ||
            company.toLowerCase().includes('executive');

          if (isRecruitmentJob && title && company) {
            results.push({
              title,
              company,
              location,
              salary,
              description,
              url: url.startsWith('http') ? url : `https://www.reed.co.uk${url}`,
              postedDate: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn('Error extracting Reed job card:', error);
        }
      });

      return results;
    });
  }

  private async scrapeAllReedPages(page: Page, initialResults: ReedJobResult[]): Promise<ReedJobResult[]> {
    let allResults = [...initialResults];
    let currentPage = 1;
    const maxPages = 8; // Reed typically has fewer pages per search

    while (currentPage < maxPages) {
      try {
        // Look for next page link
        const nextButton = await page.$('.pagination a[rel="next"], .next-page:not(.disabled)');
        if (!nextButton) {
          break;
        }

        await nextButton.click();
        await page.waitForSelector('.job-result', { timeout: 10000 });
        await this.delay(3000 + Math.random() * 1500); // Longer delays for Reed

        const pageResults = await this.extractReedJobResults(page);
        if (pageResults.length === 0) {
          break;
        }

        allResults.push(...pageResults);
        currentPage++;

        this.logger.debug(`Scraped Reed page ${currentPage}, total results: ${allResults.length}`);

      } catch (error) {
        this.logger.warn(`Failed to scrape Reed page ${currentPage + 1}:`, error);
        break;
      }
    }

    return allResults;
  }

  private async convertReedJobsToAgencies(jobs: ReedJobResult[], searchLocation: string): Promise<AgencyData[]> {
    const agencyMap = new Map<string, AgencyData>();

    for (const job of jobs) {
      const agencyKey = job.company.toLowerCase().trim();
      
      if (!agencyMap.has(agencyKey)) {
        const agency: AgencyData = {
          name: job.company,
          website: undefined,
          description: undefined,
          location: {
            country: 'United Kingdom',
            region: this.extractUKRegionFromLocation(job.location || searchLocation),
            city: this.extractUKCityFromLocation(job.location || searchLocation)
          },
          contacts: {
            emails: [],
            phones: [],
            socialProfiles: {},
            verified: false,
            confidence: 0.7 // Reed typically has good quality data
          },
          size: undefined,
          specializations: [],
          recruiters: []
        };

        agencyMap.set(agencyKey, agency);
      }

      const agency = agencyMap.get(agencyKey)!;
      
      // Add recruiter data if this is a recruiter role
      if (this.isUKRecruiterRole(job.title)) {
        const recruiterData: RecruiterData = {
          firstName: '',
          lastName: '',
          title: job.title,
          email: job.recruiterEmail,
          phone: undefined,
          linkedin: undefined,
          specializations: {
            industries: this.extractUKIndustriesFromJob(job),
            functions: this.extractUKFunctionsFromJob(job),
            seniorityLevels: this.extractUKSeniorityFromJob(job)
          },
          location: {
            country: 'United Kingdom',
            region: this.extractUKRegionFromLocation(job.location || searchLocation),
            city: this.extractUKCityFromLocation(job.location || searchLocation)
          }
        };

        agency.recruiters?.push(recruiterData);
      }

      // Add specializations
      const jobSpecializations = this.extractUKSpecializationsFromJob(job);
      if (agency.specializations) {
        agency.specializations.push(...jobSpecializations);
        agency.specializations = [...new Set(agency.specializations)];
      }
    }

    return Array.from(agencyMap.values());
  }

  private async enrichWithUKData(agencies: AgencyData[]): Promise<AgencyData[]> {
    const enrichedAgencies: AgencyData[] = [];

    for (const agency of agencies) {
      try {
        this.logger.debug(`Enriching UK agency: ${agency.name}`);
        
        // Try to get Reed company profile
        const reedProfile = await this.scrapeReedCompanyProfile(agency.name);
        
        const enrichedAgency: AgencyData = {
          ...agency,
          website: reedProfile?.website || agency.website,
          description: reedProfile?.description || agency.description,
          size: this.mapUKCompanySizeToEnum(reedProfile?.size),
          specializations: agency.specializations || []
        };

        // Enhanced contact discovery for UK
        enrichedAgency.contacts = await this.enhanceUKContactInformation(enrichedAgency);

        // Try to get Companies House data
        const companiesHouseData = await this.getCompaniesHouseBasicInfo(agency.name);
        if (companiesHouseData) {
          (enrichedAgency as any).companiesHouseNumber = companiesHouseData.number;
          (enrichedAgency as any).incorporationDate = companiesHouseData.incorporationDate;
        }

        enrichedAgencies.push(enrichedAgency);
        
        // Rate limiting for UK compliance
        await this.delay(2000 + Math.random() * 1500);

      } catch (error) {
        this.logger.warn(`Failed to enrich UK agency ${agency.name}:`, error);
        enrichedAgencies.push(agency);
      }
    }

    return enrichedAgencies;
  }

  private async scrapeReedCompanyProfile(companyName: string): Promise<ReedCompanyProfile | null> {
    const browser = await this.launchUKBrowser();
    
    try {
      const page = await browser.newPage();
      await this.setupUKPageForScraping(page);

      // Reed company profile URL pattern
      const searchUrl = `${this.baseUrl}/employers/${this.slugify(companyName)}`;
      
      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      } catch (error) {
        // Try search if direct URL fails
        const searchQuery = `${this.baseUrl}/employers?q=${encodeURIComponent(companyName)}`;
        await page.goto(searchQuery, { waitUntil: 'networkidle2', timeout: 15000 });
        
        const firstResult = await page.$('.employer-card a');
        if (firstResult) {
          await firstResult.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
      }

      // Extract Reed company data
      const profile = await page.evaluate(() => {
        const getText = (selector: string) => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim();
        };

        const getAttr = (selector: string, attr: string) => {
          const element = document.querySelector(selector);
          return element?.getAttribute(attr);
        };

        return {
          name: getText('h1, .company-name, .employer-name'),
          description: getText('.company-description, .employer-description, .about'),
          website: getAttr('.company-website a, .website a', 'href'),
          size: getText('.company-size, .size'),
          industry: getText('.industry, .sector'),
          location: getText('.location, .address'),
          logo: getAttr('.company-logo img, .logo img', 'src')
        };
      });

      return profile.name ? profile : null;

    } catch (error) {
      this.logger.debug(`Could not scrape Reed profile for ${companyName}:`, error);
      return null;
    } finally {
      await browser.close();
    }
  }

  private async enhanceUKContactInformation(agency: AgencyData): Promise<any> {
    // Use existing contact discovery with UK-specific enhancements
    if (agency.website) {
      return await dataCollectionService.discoverContacts(agency);
    }
    
    return agency.contacts;
  }

  private async getCompaniesHouseBasicInfo(companyName: string): Promise<{number: string, incorporationDate: string} | null> {
    // Mock implementation - in production would use Companies House API
    // This would require API key and proper implementation
    try {
      // const response = await axios.get(`https://api.companieshouse.gov.uk/search/companies?q=${encodeURIComponent(companyName)}`);
      // return response.data.items[0];
      return null;
    } catch (error) {
      return null;
    }
  }

  // UK-specific utility methods
  private convertToAgencyData(data: any, country: string): AgencyData {
    return {
      name: data.name,
      website: data.website,
      description: data.description,
      location: {
        country: country,
        region: this.extractUKRegionFromLocation(data.location),
        city: this.extractUKCityFromLocation(data.location)
      },
      contacts: {
        emails: [],
        phones: [],
        socialProfiles: {},
        verified: false,
        confidence: 0.7
      },
      size: data.size,
      specializations: data.specializations || [],
      recruiters: []
    };
  }

  private deduplicateAgencies(agencies: AgencyData[]): AgencyData[] {
    const seen = new Set<string>();
    return agencies.filter(agency => {
      const key = `${agency.name.toLowerCase()}-${agency.location.city?.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private extractUKRegionFromLocation(location: string): string {
    const ukRegions: {[key: string]: string} = {
      'London': 'London',
      'Manchester': 'North West England',
      'Birmingham': 'West Midlands',
      'Edinburgh': 'Scotland',
      'Glasgow': 'Scotland',
      'Cardiff': 'Wales',
      'Belfast': 'Northern Ireland',
      'Bristol': 'South West England',
      'Leeds': 'Yorkshire and the Humber',
      'Liverpool': 'North West England',
      'Newcastle': 'North East England',
      'Sheffield': 'Yorkshire and the Humber',
      'Nottingham': 'East Midlands',
      'Cambridge': 'East of England',
      'Oxford': 'South East England'
    };

    for (const [city, region] of Object.entries(ukRegions)) {
      if (location.toLowerCase().includes(city.toLowerCase())) {
        return region;
      }
    }

    return 'Unknown';
  }

  private extractUKCityFromLocation(location: string): string {
    const parts = location.split(',')[0].trim();
    return parts || 'Unknown';
  }

  private isUKRecruiterRole(title: string): boolean {
    const ukRecruiterKeywords = [
      'recruiter', 'recruitment consultant', 'talent acquisition', 
      'search consultant', 'talent specialist', 'talent partner',
      'recruitment manager', 'principal consultant', 'recruitment director'
    ];
    
    return ukRecruiterKeywords.some(keyword => 
      title.toLowerCase().includes(keyword)
    );
  }

  private extractUKIndustriesFromJob(job: ReedJobResult): string[] {
    const industries: string[] = [];
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    const ukIndustryKeywords = {
      'Financial Services': ['financial services', 'banking', 'investment', 'fintech', 'insurance'],
      'Technology': ['technology', 'software', 'it', 'digital', 'cyber', 'tech'],
      'Oil & Gas': ['oil', 'gas', 'energy', 'petroleum', 'offshore'],
      'Healthcare': ['healthcare', 'medical', 'pharma', 'nhs', 'clinical'],
      'Manufacturing': ['manufacturing', 'automotive', 'aerospace', 'industrial'],
      'Legal': ['legal', 'law', 'solicitor', 'barrister', 'compliance'],
      'Consulting': ['consulting', 'advisory', 'strategy', 'management consulting'],
      'Media': ['media', 'advertising', 'marketing', 'publishing', 'broadcasting']
    };

    for (const [industry, keywords] of Object.entries(ukIndustryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        industries.push(industry);
      }
    }

    return industries;
  }

  private extractUKFunctionsFromJob(job: ReedJobResult): string[] {
    const functions: string[] = [];
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    if (text.includes('executive') || text.includes('c-suite') || text.includes('board')) {
      functions.push('Executive Search');
    }
    if (text.includes('software') || text.includes('developer') || text.includes('engineer')) {
      functions.push('Technology');
    }
    if (text.includes('sales') || text.includes('business development')) {
      functions.push('Sales');
    }
    if (text.includes('marketing') || text.includes('digital marketing')) {
      functions.push('Marketing');
    }
    if (text.includes('finance') || text.includes('accounting') || text.includes('treasury')) {
      functions.push('Finance');
    }

    return functions;
  }

  private extractUKSeniorityFromJob(job: ReedJobResult): string[] {
    const levels: string[] = [];
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    if (text.includes('senior') || text.includes('sr.')) {
      levels.push('Senior');
    }
    if (text.includes('junior') || text.includes('jr.') || text.includes('graduate')) {
      levels.push('Junior');
    }
    if (text.includes('principal') || text.includes('lead') || text.includes('head of')) {
      levels.push('Principal');
    }
    if (text.includes('director') || text.includes('vp') || text.includes('vice president')) {
      levels.push('Director');
    }
    if (text.includes('executive') || text.includes('c-suite') || text.includes('chief')) {
      levels.push('Executive');
    }

    return levels;
  }

  private extractUKSpecializationsFromJob(job: ReedJobResult): string[] {
    const specializations: string[] = [];
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    const ukSpecializations = [
      'recruitment', 'talent acquisition', 'executive search', 
      'headhunting', 'talent sourcing', 'search consulting',
      'interim recruitment', 'contract recruitment', 'permanent recruitment'
    ];

    ukSpecializations.forEach(spec => {
      if (text.includes(spec)) {
        specializations.push(spec);
      }
    });

    return specializations;
  }

  private mapUKCompanySizeToEnum(sizeText?: string): string | undefined {
    if (!sizeText) return undefined;
    
    const text = sizeText.toLowerCase();
    
    if (text.includes('1-10') || text.includes('micro') || text.includes('boutique')) return 'BOUTIQUE';
    if (text.includes('11-50') || text.includes('small')) return 'SMALL';
    if (text.includes('51-250') || text.includes('medium')) return 'MEDIUM';
    if (text.includes('250+') || text.includes('large')) return 'LARGE';
    if (text.includes('1000+') || text.includes('enterprise') || text.includes('multinational')) return 'ENTERPRISE';
    
    return undefined;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { ReedUKService };